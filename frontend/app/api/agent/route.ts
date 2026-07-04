// POST /api/agent — внутренний исполнитель действий (вызывается n8n-роутером).
// Принимает {text, intent}, запускает tool-use цикл Claude Sonnet с
// инструментами календаря/почты (lib/calendar, lib/gmail) и возвращает {reply}.
// Защита: заголовок X-Internal-Token == INTERNAL_API_TOKEN (docker-сеть, не публично).

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  createEvent,
  rescheduleEvent,
  deleteEvent,
  addGuest,
  listEvents,
} from "@lib/calendar/googleCalendar";
import { readEmails, sendEmail } from "@lib/gmail/gmail";

export const maxDuration = 120;

const MODEL = process.env.LLM_COMPLEX_MODEL ?? "claude-sonnet-5";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_events",
    description: "Список встреч владельца на день или неделю.",
    input_schema: {
      type: "object",
      properties: {
        range: { type: "string", enum: ["day", "week"] },
        fromDate: { type: "string", description: "ISO-дата начала, по умолчанию сегодня" },
      },
      required: ["range"],
    },
  },
  {
    name: "create_event",
    description: "Создать встречу в календаре. Гостям автоматически уходят приглашения.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        startTime: { type: "string", description: "ISO 8601, например 2026-07-06T10:00:00" },
        endTime: { type: "string" },
        attendees: { type: "array", items: { type: "string" } },
        location: { type: "string" },
      },
      required: ["title", "startTime", "endTime"],
    },
  },
  {
    name: "reschedule_event",
    description: "Перенести существующую встречу (id берётся из list_events).",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        newStart: { type: "string" },
        newEnd: { type: "string" },
      },
      required: ["eventId", "newStart", "newEnd"],
    },
  },
  {
    name: "delete_event",
    description: "Удалить встречу по id.",
    input_schema: {
      type: "object",
      properties: { eventId: { type: "string" } },
      required: ["eventId"],
    },
  },
  {
    name: "add_guest",
    description: "Добавить гостя во встречу — приглашение уйдёт автоматически.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        guestEmail: { type: "string" },
      },
      required: ["eventId", "guestEmail"],
    },
  },
  {
    name: "read_emails",
    description: "Прочитать письма с фильтрами (отправитель/тема/дата/непрочитанные).",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string" },
        subject: { type: "string" },
        after: { type: "string", description: "ISO-дата" },
        before: { type: "string", description: "ISO-дата" },
        unreadOnly: { type: "boolean" },
      },
    },
  },
  {
    name: "send_email",
    description: "Отправить письмо от имени владельца.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        body: { type: "string" },
        cc: { type: "array", items: { type: "string" } },
      },
      required: ["to", "subject", "body"],
    },
  },
];

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "list_events":
      return JSON.stringify(
        await listEvents(input.range as "day" | "week", input.fromDate as string | undefined)
      );
    case "create_event":
      return JSON.stringify(await createEvent(input as never));
    case "reschedule_event":
      return JSON.stringify(
        await rescheduleEvent(
          input.eventId as string,
          input.newStart as string,
          input.newEnd as string
        )
      );
    case "delete_event":
      await deleteEvent(input.eventId as string);
      return JSON.stringify({ ok: true });
    case "add_guest":
      return JSON.stringify(await addGuest(input.eventId as string, input.guestEmail as string));
    case "read_emails":
      return JSON.stringify(await readEmails(input as never));
    case "send_email":
      return JSON.stringify(await sendEmail(input as never));
    default:
      return JSON.stringify({ error: `Неизвестный инструмент: ${name}` });
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-internal-token");
  if (!process.env.INTERNAL_API_TOKEN || token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { text, intent } = (await req.json().catch(() => ({}))) as {
    text?: string;
    intent?: string;
  };
  if (!text?.trim()) {
    return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
  }

  const nowStr = new Date().toLocaleString("ru-RU", {
    timeZone: process.env.TIMEZONE ?? "Asia/Almaty",
    dateStyle: "full",
    timeStyle: "short",
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: text.trim() }];
  const system = [
    "Ты — Secretar, персональный ИИ-секретарь директора фонда.",
    `Сейчас: ${nowStr} (часовой пояс ${process.env.TIMEZONE ?? "Asia/Almaty"}).`,
    "Управляй календарём и почтой владельца через инструменты.",
    "Время передавай в ISO 8601 без смещения (локальное время владельца).",
    "Отвечай кратко, по-русски, без воды. После действия подтверди результат одной-двумя фразами.",
    intent ? `Предварительная классификация запроса: ${intent}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    for (let i = 0; i < 8; i++) {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system,
        tools: TOOLS,
        messages,
      });

      if (res.stop_reason !== "tool_use") {
        const textBlock = res.content.find((b) => b.type === "text");
        const reply =
          textBlock && "text" in textBlock ? textBlock.text : "Готово.";
        return NextResponse.json({ reply });
      }

      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type !== "tool_use") continue;
        let content: string;
        let isError = false;
        try {
          content = await runTool(block.name, block.input as Record<string, unknown>);
        } catch (e) {
          content = String(e);
          isError = true;
        }
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content,
          is_error: isError,
        });
      }
      messages.push({ role: "user", content: results });
    }
    return NextResponse.json({
      reply: "Не удалось завершить действие за разумное число шагов. Уточните запрос.",
    });
  } catch (e) {
    console.error("/api/agent error:", e);
    return NextResponse.json(
      { reply: `Ошибка при выполнении: ${String(e).slice(0, 300)}` },
      { status: 500 }
    );
  }
}
