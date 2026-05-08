export const runtime = "nodejs";

// POST /api/ai/push
// ─────────────────────────────────────────────────────────────
// Android app pushes a user prompt to the database.
// The server immediately processes it via Sarvam API,
// stores the response, and returns it — all in one request.
// The app can also poll GET /api/ai/pull if it prefers async.
//
// Body:
// {
//   userId    : "uuid",
//   sessionId : "any-string-to-group-conversation",
//   message   : "How do I improve my score?",
//   model     : "SARVAM-M" | "sarvam-105b"   (optional)
//   context   : { score, screenTime, unlocks, level }  (optional)
// }

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SARVAM_KEY = "sk_b16bqeqy_iOQKwP9zkvr2LzQwJ1lwAFng";
const SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are the Life Growth AI discipline coach.
You help users improve their digital discipline by analyzing their IdleWorth scores, screen time, and unlock patterns.
Be concise (under 120 words), direct, and motivating. Use data the user shares to give specific advice.
Never make up data. Use plain text, no markdown symbols.`;

async function callSarvam(messages, model) {
  const fullMessages = [
    { role: "user",      content: SYSTEM_PROMPT },
    { role: "assistant", content: "Understood. I am your Life Growth coach. Share your stats and I will give specific, actionable advice." },
    ...messages,
  ];

  const res = await fetch(SARVAM_URL, {
    method: "POST",
    headers: {
      "API-Subscription-Key": SARVAM_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "SARVAM-M",
      messages: fullMessages,
      temperature: 0.8,
      top_p: 1,
      stream: false,          // non-streaming for DB storage
      reasoning_effort: "low",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sarvam API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}

export async function POST(request) {
  try {
    const sql = getSql();
    const body = await request.json();
    const {
      userId,
      sessionId,
      message,
      model = "SARVAM-M",
      context = {},
    } = body;

    // ── Validation ────────────────────────────────────────────
    if (!userId || !UUID_RE.test(userId))
      return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });
    if (!sessionId || typeof sessionId !== "string")
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    if (!message || typeof message !== "string" || !message.trim())
      return NextResponse.json({ error: "message is required" }, { status: 400 });

    const cleanMsg = message.trim();

    // Verify user
    const userCheck = await sql`
      SELECT user_id FROM user_profile WHERE user_id = ${userId}::uuid LIMIT 1
    `;
    if (userCheck.length === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ── Build context prefix if provided ──────────────────────
    const ctxStr = Object.keys(context).length > 0
      ? `[User stats: IdleWorth=${context.score ?? "?"}, ` +
        `Screen time=${context.screenTime ?? "?"}min, ` +
        `Unlocks=${context.unlocks ?? "?"}, ` +
        `Level=${context.level ?? "?"}] `
      : "";

    // ── Fetch conversation history for this session ───────────
    const history = await sql`
      SELECT role, content FROM ai_messages
      WHERE user_id = ${userId}::uuid
        AND session_id = ${sessionId}
        AND status = 'done'
      ORDER BY created_at ASC
      LIMIT 20
    `;

    // ── Store user message as pending ─────────────────────────
    const userRow = await sql`
      INSERT INTO ai_messages (user_id, session_id, role, content, model, status)
      VALUES (${userId}::uuid, ${sessionId}, 'user', ${cleanMsg}, ${model}, 'done')
      RETURNING id
    `;
    const userMsgId = userRow[0].id;

    // ── Store assistant placeholder as processing ─────────────
    const assistantRow = await sql`
      INSERT INTO ai_messages (user_id, session_id, role, content, model, status)
      VALUES (${userId}::uuid, ${sessionId}, 'assistant', '', ${model}, 'processing')
      RETURNING id
    `;
    const assistantMsgId = assistantRow[0].id;

    // ── Build full message history for Sarvam ─────────────────
    const sarvamMessages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: ctxStr + cleanMsg },
    ];

    // ── Call Sarvam API ───────────────────────────────────────
    let aiResponse;
    try {
      aiResponse = await callSarvam(sarvamMessages, model);
    } catch (err) {
      // Mark as error in DB
      await sql`
        UPDATE ai_messages
        SET status = 'error', content = ${err.message}, completed_at = NOW()
        WHERE id = ${assistantMsgId}
      `;
      return NextResponse.json({ error: "AI service failed", detail: err.message }, { status: 502 });
    }

    // ── Store completed response ──────────────────────────────
    await sql`
      UPDATE ai_messages
      SET status = 'done', content = ${aiResponse}, completed_at = NOW()
      WHERE id = ${assistantMsgId}
    `;

    return NextResponse.json({
      success         : true,
      userMessageId   : userMsgId,
      assistantMsgId,
      sessionId,
      response        : aiResponse,
      model,
    }, { status: 200 });

  } catch (err) {
    console.error("[ai/push]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
