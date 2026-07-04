// lib/llm/claude.ts
// Вызов Claude Sonnet 5 — используется для сложных задач: генерация писем,
// многошаговые рассуждения, планирование дня/недели (ТЗ 4.3).

import Anthropic from "@anthropic-ai/sdk";
import type { LlmMessage } from "./index";

const MODEL = process.env.LLM_COMPLEX_MODEL ?? "claude-sonnet-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY не задан. Заполните .env перед запуском.");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function callClaudeSonnet(
  messages: LlmMessage[],
  maxTokens = 1024,
  temperature = 0.4
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
