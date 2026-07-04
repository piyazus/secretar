// lib/voice/whisper.ts
// Интеграция с self-hosted faster-whisper (ТЗ раздел 4.4 / 6 / 7).
// Сервис faster-whisper-server (fedirz/faster-whisper-server) поднимается в
// infra/docker-compose.yml и отдаёт OpenAI-совместимый эндпоинт
// POST /v1/audio/transcriptions (multipart/form-data).

const WHISPER_ENDPOINT = process.env.WHISPER_ENDPOINT ?? "http://faster-whisper:8000";

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
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType = "audio/webm"
): Promise<TranscriptionResult> {
  const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : "webm";
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: mimeType }),
    `audio.${ext}`
  );
  form.append("model", process.env.WHISPER_MODEL ?? "medium");
  form.append("response_format", "verbose_json");

  const res = await fetch(`${WHISPER_ENDPOINT}/v1/audio/transcriptions`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`faster-whisper HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    text?: string;
    language?: string;
    duration?: number;
  };
  return {
    text: data.text ?? "",
    language: data.language ?? "ru",
    durationSec: data.duration ?? 0,
  };
}
