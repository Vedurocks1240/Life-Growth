// lib/db.js  — shared Postgres client (Vercel Postgres SDK)
import { sql } from "@vercel/postgres";

export { sql };

/**
 * Thin wrapper so callers can destructure rows directly.
 * Usage:  const rows = await query`SELECT * FROM user_profile WHERE username = ${name}`
 */
export async function query(strings, ...values) {
  const result = await sql(strings, ...values);
  return result.rows;
}
