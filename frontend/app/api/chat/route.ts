// POST /api/chat — принимает текстовую команду директора и передаёт её в
// n8n-роутер (webhook /webhook/chat), который классифицирует intent (Haiku),
// исполняет действие (calendar/gmail через /api/agent) и формирует ответ.
// Доступ только с активной сессией владельца (NextAuth).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL ?? "http://n8n:5678/webhook/chat";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { message } = await req.json().catch(() => ({ message: "" }));
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message.trim(), channel: "web" }),
      // n8n может думать долго (LLM + Google API)
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      throw new Error(`n8n HTTP ${res.status}`);
    }
    const data = (await res.json().catch(() => null)) as
      | { answer?: string; reply?: string }
      | null;
    const reply = data?.answer ?? data?.reply;
    if (!reply) throw new Error("n8n вернул пустой ответ");
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("/api/chat -> n8n error:", e);
    return NextResponse.json(
      { reply: "Секретарь временно недоступен (роутер n8n не ответил). Попробуйте позже." },
      { status: 502 }
    );
  }
}
