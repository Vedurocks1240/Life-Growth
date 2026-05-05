export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  try {
    const sql = getSql();
    const body = await request.json();
    const { userId, level, monthlyScore, isLoggedIn } = body;

    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });

    if (level !== undefined && (!Number.isInteger(level) || level < 1))
      return NextResponse.json({ error: "level must be a positive integer" }, { status: 400 });

    if (monthlyScore !== undefined && (typeof monthlyScore !== "number" || monthlyScore < 0 || monthlyScore > 10))
      return NextResponse.json({ error: "monthlyScore must be 0-10" }, { status: 400 });

    const rows = await sql`
      UPDATE user_profile SET
        level         = COALESCE(${level        ?? null}, level),
        monthly_score = COALESCE(${monthlyScore ?? null}, monthly_score),
        is_logged_in  = COALESCE(${isLoggedIn   ?? null}, is_logged_in)
      WHERE user_id = ${userId}::uuid
      RETURNING user_id, username, level, monthly_score, is_logged_in, updated_at
    `;

    if (rows.length === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = rows[0];

    return NextResponse.json({
      success      : true,
      userId       : user.user_id,
      username     : user.username,
      level        : user.level,
      monthlyScore : parseFloat(user.monthly_score),
      isLoggedIn   : user.is_logged_in,
      updatedAt    : user.updated_at,
    }, { status: 200 });

  } catch (err) {
    console.error("[sync/profile POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const sql = getSql();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });

    const rows = await sql`
      SELECT user_id, username, level, monthly_score, is_logged_in, created_at, updated_at
      FROM user_profile
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = rows[0];

    return NextResponse.json({
      userId       : user.user_id,
      username     : user.username,
      level        : user.level,
      monthlyScore : parseFloat(user.monthly_score),
      isLoggedIn   : user.is_logged_in,
      createdAt    : user.created_at,
      updatedAt    : user.updated_at,
    }, { status: 200 });

  } catch (err) {
    console.error("[sync/profile GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
