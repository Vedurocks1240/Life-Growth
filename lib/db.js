// lib/db.js — standard pg client (works with any Postgres URL)
import { Pool } from "pg";

let pool;

export function getSql() {
  if (!pool) {
    const url =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.PRISMA_DATABASE_URL;

    if (!url) throw new Error("No database URL found in environment variables");

    pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }

  // Return a tagged-template sql function matching the neon interface
  return function sql(strings, ...values) {
    let text = "";
    let paramIndex = 1;
    const params = [];

    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < values.length) {
        params.push(values[i]);
        text += `$${paramIndex++}`;
      }
    }

    return pool.query(text, params).then((res) => res.rows);
  };
}
