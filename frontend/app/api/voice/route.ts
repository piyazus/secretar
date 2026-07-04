// POST /api/voice — принимает аудио (raw body, MediaRecorder webm/wav/mp3),
// транскрибирует через self-hosted faster-whisper (ТЗ §4.4) и возвращает текст.
// Дальше фронтенд отправляет распознанный текст обычным путём в /api/chat.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transcribeAudio } from "@lib/voice/whisper";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const mimeType = req.headers.get("content-type") ?? "audio/webm";
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "Пустое аудио" }, { status: 400 });
  }
  if (buf.length > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Аудио слишком большое (>25 МБ)" }, { status: 413 });
  }

  try {
    const result = await transcribeAudio(buf, mimeType);
    return NextResponse.json({
      text: result.text,
      language: result.language,
      durationSec: result.durationSec,
    });
  } catch (e) {
    console.error("/api/voice error:", e);
    return NextResponse.json(
      { error: "Не удалось распознать речь (faster-whisper недоступен?)" },
      { status: 502 }
    );
  }
}
