export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_RE = /^[0-9a-f]{64}$/;

export async function POST(request) {
  try {
    const sql = getSql();
    const body = await request.json();
    const { userId, passwordHash, level = 1, monthlyScore = 10.0 } = body;
    let username = (body.username || "").replace(/\s+/g, "").toLowerCase();

    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId (must be UUID v4)" }, { status: 400 });

    if (!username || username.length < 3 || username.length > 64)
      return NextResponse.json({ error: "username must be 3-64 characters (no spaces)" }, { status: 400 });

    if (!passwordHash || !HASH_RE.test(passwordHash))
      return NextResponse.json({ error: "passwordHash must be a 64-char hex SHA-256 string" }, { status: 400 });

    const rows = await sql`
      INSERT INTO user_profile (user_id, username, password_hash, level, monthly_score)
      VALUES (${userId}::uuid, ${username}, ${passwordHash}, ${level}, ${monthlyScore})
      RETURNING user_id, username, level, monthly_score, created_at
    `;

    const user = rows[0];

    return NextResponse.json({
      success      : true,
      userId       : user.user_id,
      username     : user.username,
      level        : user.level,
      monthlyScore : parseFloat(user.monthly_score),
      createdAt    : user.created_at,
    }, { status: 201 });

  } catch (err) {
    if (err.code === "23505")
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
