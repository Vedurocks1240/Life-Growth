export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { verifyHash } from "@/lib/auth";

const HASH_RE = /^[0-9a-f]{64}$/;

export async function POST(request) {
  try {
    const sql = getSql();
    const body = await request.json();
    const { username, passwordHash } = body;

    username = username.replace(/\s+/g, "").toLowerCase();
    if (!username)
      return NextResponse.json({ error: "username is required" }, { status: 400 });

    if (!passwordHash || !HASH_RE.test(passwordHash))
      return NextResponse.json({ error: "passwordHash must be a 64-char hex string" }, { status: 400 });

    const rows = await sql`
      SELECT user_id, username, password_hash, level, monthly_score, is_logged_in, created_at
      FROM user_profile
      WHERE username = ${username}
      LIMIT 1
    `;

    if (rows.length === 0)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const user = rows[0];

    if (!verifyHash(passwordHash, user.password_hash))
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    await sql`
      UPDATE user_profile SET is_logged_in = TRUE WHERE user_id = ${user.user_id}::uuid
    `;

    return NextResponse.json({
      success      : true,
      userId       : user.user_id,
      username     : user.username,
      level        : user.level,
      monthlyScore : parseFloat(user.monthly_score),
      isLoggedIn   : true,
      createdAt    : user.created_at,
    }, { status: 200 });

  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
