// lib/db.js  — Neon Postgres client (replaces deprecated @vercel/postgres)
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL);

export { sql };
