export const runtime = "nodejs";

// app/api/auth/login/route.js
// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
//
// Body:
// {
//   username     : "alice",
//   passwordHash : "64-char-hex-sha256"   ← already hashed by client
// }
//
// Returns:
//   200  full UserProfileEntity
//   400  validation error
//   401  wrong credentials
//   500  server error
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyHash } from "@/lib/auth";

const HASH_RE = /^[0-9a-f]{64}$/;

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, passwordHash } = body;

    // ── Validation ──────────────────────────────────────────
    if (!username || typeof username !== "string")
      return NextResponse.json({ error: "username is required" }, { status: 400 });

    if (!passwordHash || !HASH_RE.test(passwordHash))
      return NextResponse.json({ error: "passwordHash must be a 64-char hex string" }, { status: 400 });

    // ── Lookup user ──────────────────────────────────────────
    const rows = await sql`
      SELECT user_id, username, password_hash, level, monthly_score, is_logged_in, created_at
      FROM user_profile
      WHERE username = ${username.toLowerCase()}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = rows[0];

    // ── Constant-time hash comparison ────────────────────────
    if (!verifyHash(passwordHash, user.password_hash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // ── Mark logged in ───────────────────────────────────────
    await sql`
      UPDATE user_profile SET is_logged_in = TRUE WHERE user_id = ${user.user_id}::uuid
    `;

    return NextResponse.json(
      {
        success      : true,
        userId       : user.user_id,
        username     : user.username,
        level        : user.level,
        monthlyScore : parseFloat(user.monthly_score),
        isLoggedIn   : true,
        createdAt    : user.created_at,
      },
      { status: 200 }
    );

  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
