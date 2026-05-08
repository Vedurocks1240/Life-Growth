export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── IdleWorth Scoring Engine ──────────────────────────────────────────────────
// All deduction rules live here on the server — the Android app just sends raw
// usage data and pulls back the computed score. This prevents any client-side
// manipulation and keeps scoring consistent across devices.

const RULES = {
  idleWorthAppPerMin   : 0.5  / 5,   // −0.5 pts per 5 min of IW app usage
  generalScreenPerMin  : 1.0  / 20,  // −1.0 pts per 20 min of general screen time
  unlockPenalty        : 0.01,        // −0.01 pts per unlock
  categories: {
    Entertainment : 1.0  / 15,  // −1.0 per 15 min
    Communication : 0.1  / 5,   // −0.1  per 5  min
    Browser       : 2.0  / 20,  // −2.0  per 20 min
    Games         : 0.2  / 5,   // −0.2  per 5  min
    // Productivity / Health / Other → no penalty
  },
};

function computeIdleWorth({ screenTimeMinutes, unlockCount, appUsage = [] }) {
  let score = 10.0;
  let trackedMinutes = 0;

  // Category deductions
  for (const app of appUsage) {
    const rate = RULES.categories[app.category];
    if (rate) {
      score -= app.usageTimeMinutes * rate;
      trackedMinutes += app.usageTimeMinutes;
    }
    // IdleWorth app usage penalty
    if (app.appName === "Life Growth" || app.category === "IdleWorthApp") {
      score -= app.usageTimeMinutes * RULES.idleWorthAppPerMin;
    }
  }

  // General screen time (remainder after tracked categories)
  const generalMinutes = Math.max(0, screenTimeMinutes - trackedMinutes);
  score -= generalMinutes * RULES.generalScreenPerMin;

  // Unlock penalty
  score -= (unlockCount || 0) * RULES.unlockPenalty;

  // Clamp 0–10, round to 2 decimal places
  return Math.round(Math.max(0, Math.min(10, score)) * 100) / 100;
}

function generateInsight(score, screenTimeMinutes, unlockCount, appUsage) {
  const h = Math.floor(screenTimeMinutes / 60);
  const topCategory = appUsage.sort((a,b) => b.usageTimeMinutes - a.usageTimeMinutes)[0];

  if (score >= 9.0) return "Outstanding discipline. You are in the top tier of mindful phone users today.";
  if (score >= 8.0) return `Great control today. ${unlockCount < 40 ? "Low unlock count kept your score high." : "Consider reducing unlocks for an even better score."}`;
  if (score >= 7.0) return `Solid day. ${topCategory ? `Your ${topCategory.category} usage (${topCategory.usageTimeMinutes}m) was the biggest factor.` : `${h}h screen time is manageable.`}`;
  if (score >= 6.0) return `Moderate usage. ${screenTimeMinutes > 240 ? `Cutting ${screenTimeMinutes - 180} minutes of screen time would significantly boost your score.` : `${unlockCount} unlocks is adding up — try focus sessions.`}`;
  if (score >= 4.0) return `High phone usage detected. ${topCategory ? `${topCategory.category} apps used for ${topCategory.usageTimeMinutes}m — consider a time limit.` : "Try setting app timers."}`;
  return "Very high usage today. Consider a digital detox tomorrow — even 2 hours offline will help reset your habits.";
}

// ── POST /api/score/compute ───────────────────────────────────────────────────
// Android app sends raw data → server computes score → stores it → returns score
// Body: { userId, date, screenTimeMinutes, unlockCount, appUsage[] }
export async function POST(request) {
  try {
    const sql = getSql();
    const body = await request.json();
    const {
      userId,
      date,
      screenTimeMinutes = 0,
      unlockCount = 0,
      appUsage = [],
    } = body;

    // Validation
    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });

    // Verify user exists
    const userCheck = await sql`
      SELECT user_id, level FROM user_profile WHERE user_id = ${userId}::uuid LIMIT 1
    `;
    if (userCheck.length === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ── Compute score server-side ─────────────────────────────────────────────
    const idleWorthScore = computeIdleWorth({ screenTimeMinutes, unlockCount, appUsage });
    const aiInsight = generateInsight(idleWorthScore, screenTimeMinutes, unlockCount, [...appUsage]);

    // ── Upsert usage_stats ────────────────────────────────────────────────────
    await sql`
      INSERT INTO usage_stats
        (user_id, stat_date, screen_time_minutes, unlock_count, idle_worth_score, ai_insight)
      VALUES
        (${userId}::uuid, ${date}::date, ${screenTimeMinutes}, ${unlockCount}, ${idleWorthScore}, ${aiInsight})
      ON CONFLICT (user_id, stat_date) DO UPDATE SET
        screen_time_minutes = EXCLUDED.screen_time_minutes,
        unlock_count        = EXCLUDED.unlock_count,
        idle_worth_score    = EXCLUDED.idle_worth_score,
        ai_insight          = EXCLUDED.ai_insight,
        synced_at           = NOW()
    `;

    // ── Upsert app_usage ──────────────────────────────────────────────────────
    for (const app of appUsage) {
      if (!app.appName) continue;
      await sql`
        INSERT INTO app_usage
          (user_id, stat_date, app_name, category, usage_time_minutes)
        VALUES
          (${userId}::uuid, ${date}::date, ${app.appName}, ${app.category || "Other"}, ${app.usageTimeMinutes || 0})
        ON CONFLICT (user_id, stat_date, app_name) DO UPDATE SET
          usage_time_minutes = EXCLUDED.usage_time_minutes,
          category           = EXCLUDED.category,
          synced_at          = NOW()
      `;
    }

    // ── Recompute monthly score (rolling 30-day avg) ──────────────────────────
    const monthlyRows = await sql`
      SELECT ROUND(AVG(idle_worth_score)::numeric, 2) AS monthly_score
      FROM usage_stats
      WHERE user_id = ${userId}::uuid
        AND stat_date >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const monthlyScore = parseFloat(monthlyRows[0]?.monthly_score || idleWorthScore);

    // ── Compute level (every 50 good days = +1 level) ─────────────────────────
    const goodDaysRows = await sql`
      SELECT COUNT(*) AS good_days
      FROM usage_stats
      WHERE user_id = ${userId}::uuid AND idle_worth_score >= 7.0
    `;
    const goodDays = parseInt(goodDaysRows[0]?.good_days || 0);
    const newLevel = Math.max(1, Math.floor(goodDays / 10) + 1);

    // ── Update profile with new monthly score and level ───────────────────────
    await sql`
      UPDATE user_profile
      SET monthly_score = ${monthlyScore}, level = ${newLevel}
      WHERE user_id = ${userId}::uuid
    `;

    return NextResponse.json({
      success          : true,
      date,
      idleWorthScore,
      aiInsight,
      monthlyScore,
      level            : newLevel,
      breakdown: {
        baseScore      : 10.0,
        categoryPenalty: Math.round((10 - idleWorthScore) * 100) / 100,
        screenMinutes  : screenTimeMinutes,
        unlocks        : unlockCount,
      },
    }, { status: 200 });

  } catch (err) {
    console.error("[score/compute]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/score/compute?userId=UUID&date=YYYY-MM-DD ────────────────────────
// Android app pulls the latest computed score for a given date
export async function GET(request) {
  try {
    const sql = getSql();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date   = searchParams.get("date");

    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });

    // If no date, return today's score + last 7 days
    const rows = date
      ? await sql`
          SELECT stat_date::text AS date, screen_time_minutes, unlock_count,
                 idle_worth_score::float AS "idleWorthScore", ai_insight
          FROM usage_stats
          WHERE user_id = ${userId}::uuid AND stat_date = ${date}::date
          LIMIT 1
        `
      : await sql`
          SELECT stat_date::text AS date, screen_time_minutes, unlock_count,
                 idle_worth_score::float AS "idleWorthScore", ai_insight
          FROM usage_stats
          WHERE user_id = ${userId}::uuid
          ORDER BY stat_date DESC
          LIMIT 7
        `;

    const profile = await sql`
      SELECT level, monthly_score FROM user_profile WHERE user_id = ${userId}::uuid LIMIT 1
    `;

    if (rows.length === 0)
      return NextResponse.json({ error: "No score found for this date" }, { status: 404 });

    return NextResponse.json({
      score   : date ? rows[0] : rows,
      level   : profile[0]?.level || 1,
      monthlyScore: parseFloat(profile[0]?.monthly_score || 0),
    }, { status: 200 });

  } catch (err) {
    console.error("[score GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
