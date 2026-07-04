// lib/llm/haiku.ts
// Вызов Claude Haiku 4.5 — быстрый и дешёвый роутинг/классификация входящей
// команды пользователя (какой домен: календарь / почта / аналитика / прочее).
// TODO: заменить на @anthropic-ai/sdk после получения ANTHROPIC_API_KEY.

import type { LlmMessage } from "./index";

const MODEL = process.env.LLM_ROUTING_MODEL ?? "claude-haiku-4-5-20251001";
const API_KEY = process.env.ANTHROPIC_API_KEY;

export async function callClaudeHaiku(
  messages: LlmMessage[],
  maxTokens = 256,
  temperature = 0
): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY не задан. Заполните .env.local перед первым запуском (см. README §Deploy)."
    );
  }

  // TODO: реальный вызов через Anthropic SDK (см. claude.ts). Используется для
  // классификации intent: calendar.create / calendar.reschedule / calendar.delete /
  // calendar.add_guest / calendar.view / mail.read / mail.send / summary / other.
  throw new Error(`callClaudeHaiku: заглушка, модель=${MODEL}. Реализовать интеграцию с Anthropic SDK.`);
}
