export const runtime = "nodejs";

// app/api/sync/usage/route.js
// ─────────────────────────────────────────────────────────────
// POST /api/sync/usage
//
// Body:
// {
//   userId       : "uuid",
//   date         : "2025-05-04",          ← ISO date string (key)
//   screenTimeMinutes : 195,
//   unlockCount  : 34,
//   idleWorthScore    : 8.8,
//   aiInsight    : "Outstanding discipline...",
//   appUsage     : [                      ← optional per-app breakdown
//     { appName: "Gmail", category: "Productivity", usageTimeMinutes: 30 },
//     ...
//   ]
// }
//
// Both usage_stats and app_usage are upserted (INSERT … ON CONFLICT DO UPDATE).
// This is safe to call repeatedly as the Android app syncs frequently.
//
// Returns:
//   200  { success, date, idleWorthScore }
//   400  validation error
//   404  userId not found
//   500  server error
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userId,
      date,
      screenTimeMinutes = 0,
      unlockCount = 0,
      idleWorthScore = 10.0,
      aiInsight = null,
      appUsage = [],
    } = body;

    // ── Validation ──────────────────────────────────────────
    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });

    if (!date || !DATE_RE.test(date))
      return NextResponse.json({ error: "date must be ISO format YYYY-MM-DD" }, { status: 400 });

    // ── Verify user exists ───────────────────────────────────
    const userCheck = await sql`
      SELECT user_id FROM user_profile WHERE user_id = ${userId}::uuid LIMIT 1
    `;
    if (userCheck.length === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ── Upsert daily stats ───────────────────────────────────
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

    // ── Upsert per-app breakdown (if provided) ───────────────
    if (Array.isArray(appUsage) && appUsage.length > 0) {
      for (const app of appUsage) {
        const { appName, category = "Other", usageTimeMinutes = 0 } = app;
        if (!appName) continue;

        await sql`
          INSERT INTO app_usage
            (user_id, stat_date, app_name, category, usage_time_minutes)
          VALUES
            (${userId}::uuid, ${date}::date, ${appName}, ${category}, ${usageTimeMinutes})
          ON CONFLICT (user_id, stat_date, app_name) DO UPDATE SET
            usage_time_minutes = EXCLUDED.usage_time_minutes,
            category           = EXCLUDED.category,
            synced_at          = NOW()
        `;
      }
    }

    return NextResponse.json(
      { success: true, date, idleWorthScore },
      { status: 200 }
    );

  } catch (err) {
    console.error("[sync/usage]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET — fetch last 7 days of stats for the dashboard ───────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const days   = Math.min(parseInt(searchParams.get("days") || "7", 10), 90);

    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });

    const stats = await sql`
      SELECT
        stat_date::text            AS date,
        screen_time_minutes        AS "screenTimeMinutes",
        unlock_count               AS "unlockCount",
        idle_worth_score::float    AS "idleWorthScore",
        ai_insight                 AS "aiInsight"
      FROM usage_stats
      WHERE user_id = ${userId}::uuid
      ORDER BY stat_date DESC
      LIMIT ${days}
    `;

    const appUsage = await sql`
      SELECT
        app_name               AS "appName",
        category,
        SUM(usage_time_minutes) AS "usageTimeMinutes"
      FROM app_usage
      WHERE user_id = ${userId}::uuid
        AND stat_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY app_name, category
      ORDER BY "usageTimeMinutes" DESC
      LIMIT 20
    `;

    return NextResponse.json(
      {
        stats    : stats.reverse(),
        appUsage : appUsage,
      },
      { status: 200 }
    );

  } catch (err) {
    console.error("[sync/usage GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
