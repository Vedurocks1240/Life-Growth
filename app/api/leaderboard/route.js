export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

// GET /api/leaderboard?limit=50
// Returns ranked users by avg IdleWorth score (last 7 days)
// No sensitive data exposed — only username, level, scores, rank
export async function GET(request) {
  try {
    const sql = getSql();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const userId = searchParams.get("userId") || null;

    const rows = await sql`
      SELECT
        up.user_id,
        up.username,
        up.level,
        up.monthly_score,
        ROUND(AVG(us.idle_worth_score)::numeric, 2)   AS avg_score_7d,
        MAX(us.idle_worth_score)                       AS best_score,
        COUNT(us.id)                                   AS days_tracked,
        SUM(us.screen_time_minutes)                    AS total_screen_time,
        SUM(us.unlock_count)                           AS total_unlocks,
        MAX(us.stat_date)                              AS last_active
      FROM user_profile up
      JOIN usage_stats us ON us.user_id = up.user_id
      WHERE us.stat_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY up.user_id, up.username, up.level, up.monthly_score
      HAVING COUNT(us.id) >= 1
      ORDER BY avg_score_7d DESC, up.level DESC
      LIMIT ${limit}
    `;

    // Assign ranks, flag current user
    const ranked = rows.map((r, i) => ({
      rank         : i + 1,
      username     : r.username,
      level        : r.level,
      avgScore7d   : parseFloat(r.avg_score_7d),
      bestScore    : parseFloat(r.best_score),
      daysTracked  : parseInt(r.days_tracked),
      monthlyScore : parseFloat(r.monthly_score),
      lastActive   : r.last_active,
      isCurrentUser: r.user_id === userId,
    }));

    // Also get current user's rank if they're outside top N
    let currentUserRank = null;
    if (userId) {
      const userRankRows = await sql`
        SELECT COUNT(*) + 1 AS rank
        FROM (
          SELECT up.user_id,
            AVG(us.idle_worth_score) AS avg_score
          FROM user_profile up
          JOIN usage_stats us ON us.user_id = up.user_id
          WHERE us.stat_date >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY up.user_id
        ) sub
        WHERE sub.avg_score > (
          SELECT AVG(us2.idle_worth_score)
          FROM usage_stats us2
          WHERE us2.user_id = ${userId}::uuid
            AND us2.stat_date >= CURRENT_DATE - INTERVAL '7 days'
        )
      `;
      currentUserRank = parseInt(userRankRows[0]?.rank || 0);
    }

    return NextResponse.json({ leaderboard: ranked, currentUserRank }, { status: 200 });

  } catch (err) {
    console.error("[leaderboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
