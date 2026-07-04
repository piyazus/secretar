// lib/llm/index.ts
// Единая точка входа для вызовов LLM. Выбор модели переключается через env,
// чтобы роутинг/классификация шли на Haiku (дёшево/быстро), а сложные задачи —
// на Sonnet (качество). См. ТЗ раздел 6-7.

import { callClaudeSonnet } from "./claude";
import { callClaudeHaiku } from "./haiku";

export type LlmTask = "complex" | "routing";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCallOptions {
  task: LlmTask;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Роутер вызовов LLM.
 * task = "routing"  -> Haiku 4.5 (классификация команды: календарь/почта/аналитика/прочее)
 * task = "complex"  -> Sonnet 5 (генерация писем, сложные ответы, планирование)
 */
export async function callLlm(options: LlmCallOptions): Promise<string> {
  if (options.task === "routing") {
    return callClaudeHaiku(options.messages, options.maxTokens, options.temperature);
  }
  return callClaudeSonnet(options.messages, options.maxTokens, options.temperature);
}
