// lib/llm/claude.ts
// Вызов Claude Sonnet 5 — используется для сложных задач: генерация писем,
// многошаговые рассуждения, планирование дня/недели (ТЗ 4.3).
// TODO: заменить на @anthropic-ai/sdk после получения ANTHROPIC_API_KEY.

import type { LlmMessage } from "./index";

const MODEL = process.env.LLM_COMPLEX_MODEL ?? "claude-sonnet-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;

export async function callClaudeSonnet(
  messages: LlmMessage[],
  maxTokens = 1024,
  temperature = 0.4
): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY не задан. Заполните .env.local перед первым запуском (см. README §Deploy)."
    );
  }

  // TODO: реальный вызов через Anthropic SDK, например:
  // const anthropic = new Anthropic({ apiKey: API_KEY });
  // const res = await anthropic.messages.create({ model: MODEL, max_tokens: maxTokens, temperature, messages });
  // return res.content[0].text;

  throw new Error(`callClaudeSonnet: заглушка, модель=${MODEL}. Реализовать интеграцию с Anthropic SDK.`);
}
