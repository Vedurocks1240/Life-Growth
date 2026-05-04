// app/api/auth/register/route.js
// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
//
// Body (matches UserProfileEntity from Android):
// {
//   userId       : "uuid-v4",
//   username     : "alice",
//   passwordHash : "64-char-hex-sha256",
//   level        : 1,
//   monthlyScore : 10.0,
//   isLoggedIn   : false
// }
//
// Returns:
//   201  { success, userId, username, level, monthlyScore }
//   400  { error }   — validation failure
//   409  { error }   — username already taken
//   500  { error }
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_RE  = /^[0-9a-f]{64}$/;

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, username, passwordHash, level = 1, monthlyScore = 10.0 } = body;

    // ── Validation ──────────────────────────────────────────
    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId (must be UUID v4)" }, { status: 400 });

    if (!username || typeof username !== "string" || username.length < 3 || username.length > 64)
      return NextResponse.json({ error: "username must be 3–64 characters" }, { status: 400 });

    if (!passwordHash || !HASH_RE.test(passwordHash))
      return NextResponse.json({ error: "passwordHash must be a 64-char hex SHA-256 string" }, { status: 400 });

    // ── Insert ───────────────────────────────────────────────
    const result = await sql`
      INSERT INTO user_profile (user_id, username, password_hash, level, monthly_score)
      VALUES (${userId}::uuid, ${username.toLowerCase()}, ${passwordHash}, ${level}, ${monthlyScore})
      RETURNING user_id, username, level, monthly_score, created_at
    `;

    const user = result.rows[0];

    return NextResponse.json(
      {
        success      : true,
        userId       : user.user_id,
        username     : user.username,
        level        : user.level,
        monthlyScore : parseFloat(user.monthly_score),
        createdAt    : user.created_at,
      },
      { status: 201 }
    );

  } catch (err) {
    // Postgres unique-violation code 23505
    if (err.code === "23505") {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
