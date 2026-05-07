export const runtime = "nodejs";

import { NextResponse } from "next/server";

const SARVAM_API_KEY = "sk_b16bqeqy_iOQKwP9zkvr2LzQwJ1lwAFng";
const SARVAM_URL     = "https://api.sarvam.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are the Life Growth AI discipline coach built into the IdleWorth dashboard. 
You help users improve their digital discipline by analyzing their screen time, unlock counts, and IdleWorth scores.
Be concise (under 120 words), direct, and motivating. Use data the user shares to give specific advice.
Never make up data — only reference what the user tells you. Use plain text, no markdown.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages, model = "SARVAM-M" } = body;

    if (!messages || !Array.isArray(messages))
      return NextResponse.json({ error: "messages array required" }, { status: 400 });

    // Build full message list with system prompt injected as first user/assistant pair
    const fullMessages = [
      { role: "user",      content: SYSTEM_PROMPT },
      { role: "assistant", content: "Understood. I am your Life Growth AI coach. Share your stats and I will give you specific, actionable advice." },
      ...messages,
    ];

    const sarvamRes = await fetch(SARVAM_URL, {
      method: "POST",
      headers: {
        "API-Subscription-Key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature: 0.8,
        top_p: 1,
        stream: true,
        reasoning_effort: "low",
      }),
    });

    if (!sarvamRes.ok) {
      const err = await sarvamRes.text();
      console.error("[ai] Sarvam error:", err);
      return NextResponse.json({ error: "AI service error", detail: err }, { status: sarvamRes.status });
    }

    // Stream the response back to the browser as Server-Sent Events
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = sarvamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop(); // keep incomplete last line

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const chunk = JSON.parse(data);
                const delta = chunk?.choices?.[0]?.delta;
                if (delta?.content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.content })}\n\n`));
                }
              } catch {}
            }
          }
        } catch (e) {
          console.error("[ai stream]", e);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err) {
    console.error("[ai]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
