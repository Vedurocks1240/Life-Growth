export const runtime = "nodejs";

// GET /api/ai/sessions?userId=UUID
// Returns list of all conversation sessions for a user
// with last message preview and timestamp.

// DELETE /api/ai/sessions?userId=UUID&sessionId=STRING
// Clears all messages for a session.

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
  try {
    const sql = getSql();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });

    const sessions = await sql`
      SELECT
        session_id                              AS "sessionId",
        COUNT(*)                                AS "messageCount",
        MAX(created_at)                         AS "lastActivity",
        (ARRAY_AGG(content ORDER BY created_at DESC))[1] AS "lastMessage"
      FROM ai_messages
      WHERE user_id = ${userId}::uuid AND status = 'done'
      GROUP BY session_id
      ORDER BY MAX(created_at) DESC
      LIMIT 20
    `;

    return NextResponse.json({ sessions }, { status: 200 });

  } catch (err) {
    console.error("[ai/sessions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const sql = getSql();
    const { searchParams } = new URL(request.url);
    const userId    = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");

    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });
    if (!sessionId)
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    await sql`
      DELETE FROM ai_messages
      WHERE user_id = ${userId}::uuid AND session_id = ${sessionId}
    `;

    return NextResponse.json({ success: true, sessionId }, { status: 200 });

  } catch (err) {
    console.error("[ai/sessions DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
