// lib/llm/haiku.ts
// Вызов Claude Haiku 4.5 — быстрый и дешёвый роутинг/классификация входящей
// команды пользователя (какой домен: календарь / почта / аналитика / прочее).

import Anthropic from "@anthropic-ai/sdk";
import type { LlmMessage } from "./index";

const MODEL = process.env.LLM_ROUTING_MODEL ?? "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY не задан. Заполните .env перед запуском.");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function callClaudeHaiku(
  messages: LlmMessage[],
  maxTokens = 256,
  temperature = 0
): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: rest,
  });
  const block = res.content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "";
}
