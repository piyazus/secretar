// lib/voice/whisper.ts
// Интеграция с self-hosted faster-whisper (ТЗ раздел 4.4 / 6 / 7).
// Whisper поднимается как отдельный сервис в infra/docker-compose.yml,
// доступен по внутреннему адресу WHISPER_ENDPOINT (см. .env.example).

const WHISPER_ENDPOINT = process.env.WHISPER_ENDPOINT ?? "http://faster-whisper:9000";

export interface TranscriptionResult {
  text: string;
  language: string;
  durationSec: number;
}

/**
 * Отправляет аудио (webm/wav/mp3 buffer) на self-hosted faster-whisper и
 * возвращает транскрипцию, которая далее передаётся в LLM-роутер (lib/llm)
 * как обычная текстовая команда.
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType = "audio/webm"): Promise<TranscriptionResult> {
  // TODO: POST multipart/form-data на `${WHISPER_ENDPOINT}/asr` (см. README сервиса
  // faster-whisper-server в infra/docker-compose.yml), распарсить ответ.
  throw new Error(`transcribeAudio: заглушка. endpoint=${WHISPER_ENDPOINT}`);
}
