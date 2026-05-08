export const runtime = "nodejs";

// GET /api/ai/pull?userId=UUID&sessionId=STRING&after=TIMESTAMP
// ─────────────────────────────────────────────────────────────
// Android app polls this to get new messages since last pull.
// Returns all messages for a session, or only new ones after a timestamp.
//
// Also supports:
// GET /api/ai/pull?userId=UUID&sessionId=STRING&messageId=N&waitForDone=true
// Long-polls until a specific message is no longer 'processing' (max 25s).

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
  try {
    const sql = getSql();
    const { searchParams } = new URL(request.url);
    const userId      = searchParams.get("userId");
    const sessionId   = searchParams.get("sessionId");
    const after       = searchParams.get("after");       // ISO timestamp
    const messageId   = searchParams.get("messageId");   // wait for specific msg
    const waitForDone = searchParams.get("waitForDone") === "true";

    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });
    if (!sessionId)
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

    // ── Long-poll: wait for a specific message to finish processing ───────────
    if (messageId && waitForDone) {
      const maxWait  = 25000; // 25 seconds max
      const interval = 500;   // check every 500ms
      const start    = Date.now();

      while (Date.now() - start < maxWait) {
        const rows = await sql`
          SELECT id, role, content, status, model, created_at, completed_at
          FROM ai_messages
          WHERE id = ${parseInt(messageId)} AND user_id = ${userId}::uuid
          LIMIT 1
        `;
        if (rows.length > 0 && rows[0].status !== "processing") {
          return NextResponse.json({ message: rows[0] }, { status: 200 });
        }
        await new Promise(r => setTimeout(r, interval));
      }
      // Timed out — return current state
      const rows = await sql`
        SELECT id, role, content, status, model, created_at, completed_at
        FROM ai_messages
        WHERE id = ${parseInt(messageId)} AND user_id = ${userId}::uuid
        LIMIT 1
      `;
      return NextResponse.json({ message: rows[0] || null, timedOut: true }, { status: 200 });
    }

    // ── Normal fetch: get all messages for session, optionally after timestamp ─
    const messages = after
      ? await sql`
          SELECT id, role, content, status, model, created_at, completed_at
          FROM ai_messages
          WHERE user_id  = ${userId}::uuid
            AND session_id = ${sessionId}
            AND created_at > ${after}::timestamptz
          ORDER BY created_at ASC
          LIMIT 50
        `
      : await sql`
          SELECT id, role, content, status, model, created_at, completed_at
          FROM ai_messages
          WHERE user_id  = ${userId}::uuid
            AND session_id = ${sessionId}
          ORDER BY created_at ASC
          LIMIT 50
        `;

    return NextResponse.json({
      sessionId,
      messages,
      count     : messages.length,
      lastTs    : messages.length > 0 ? messages[messages.length - 1].created_at : null,
    }, { status: 200 });

  } catch (err) {
    console.error("[ai/pull]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
