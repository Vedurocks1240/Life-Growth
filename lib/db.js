// lib/db.js — lazy Neon client
import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  if (!url) {
    throw new Error("No database URL found in environment variables");
  }

  // Neon serverless driver requires the neondb.net host directly.
  // If the URL uses a pooler host (pgbouncer), swap it to the direct host.
  const directUrl = url.replace("-pooler.eu-central-1", "").replace("-pooler.", ".");

  return neon(directUrl);
}
