// lib/db.js — lazy Neon client (safe at build time)
import { neon } from "@neondatabase/serverless";

// Do NOT call neon() at module level — POSTGRES_URL is undefined during build.
// Call getSql() inside each request handler instead.
export function getSql() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL environment variable is not set");
  }
  return neon(process.env.POSTGRES_URL);
}
