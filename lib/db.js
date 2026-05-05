// lib/db.js — lazy Neon client with fallback env var names
import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "No database URL found. Checked: POSTGRES_URL_NON_POOLING, POSTGRES_URL, DATABASE_URL"
    );
  }

  return neon(url);
}
