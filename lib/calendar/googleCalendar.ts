// lib/calendar/googleCalendar.ts
// Google Calendar API — реализация под ТЗ раздел 4.1.
// Все действия логируются в audit_log (ТЗ раздел 5): actor, action, target, details.

import { google } from "googleapis";
import { getOAuthClient } from "../google/auth";
import { writeAuditLog } from "../audit";

export interface CalendarEventInput {
  title: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  attendees?: string[]; // email-адреса
  location?: string; // адрес или ссылка (Meet/Zoom)
}

export interface CalendarEvent extends CalendarEventInput {
  id: string;
}

const TZ = process.env.TIMEZONE ?? "Asia/Almaty";

async function calendarClient() {
  const auth = await getOAuthClient();
  return google.calendar({ version: "v3", auth });
}

function toEvent(e: {
  id?: string | null;
  summary?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
  attendees?: { email?: string | null }[] | null;
  location?: string | null;
}): CalendarEvent {
  return {
    id: e.id ?? "",
    title: e.summary ?? "(без названия)",
    startTime: e.start?.dateTime ?? e.start?.date ?? "",
    endTime: e.end?.dateTime ?? e.end?.date ?? "",
    attendees: (e.attendees ?? []).map((a) => a.email ?? "").filter(Boolean),
    location: e.location ?? undefined,
  };
}

/** Создание встречи. ТЗ 4.1: тема, время, участники, локация/ссылка. */
export async function createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  try {
    const calendar = await calendarClient();
    const res = await calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: {
        summary: input.title,
        start: { dateTime: input.startTime, timeZone: TZ },
        end: { dateTime: input.endTime, timeZone: TZ },
        attendees: input.attendees?.map((email) => ({ email })),
        location: input.location,
      },
    });
    const event = toEvent(res.data);
    await writeAuditLog({
      actor: "agent",
      action: "calendar.create",
      target: event.id,
      details: { ...input },
    });
    return event;
  } catch (e) {
    await writeAuditLog({
      actor: "agent",
      action: "calendar.create",
      details: { ...input },
      success: false,
      error: String(e),
    });
    throw e;
  }
}

/** Перенос встречи на новое время. */
export async function rescheduleEvent(
  eventId: string,
  newStart: string,
  newEnd: string
): Promise<CalendarEvent> {
  try {
    const calendar = await calendarClient();
    const res = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
      requestBody: {
        start: { dateTime: newStart, timeZone: TZ },
        end: { dateTime: newEnd, timeZone: TZ },
      },
    });
    const event = toEvent(res.data);
    await writeAuditLog({
      actor: "agent",
      action: "calendar.reschedule",
      target: eventId,
      details: { newStart, newEnd },
    });
    return event;
  } catch (e) {
    await writeAuditLog({
      actor: "agent",
      action: "calendar.reschedule",
      target: eventId,
      details: { newStart, newEnd },
      success: false,
      error: String(e),
    });
    throw e;
  }
}

/** Удаление встречи. */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const calendar = await calendarClient();
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });
    await writeAuditLog({ actor: "agent", action: "calendar.delete", target: eventId });
  } catch (e) {
    await writeAuditLog({
      actor: "agent",
      action: "calendar.delete",
      target: eventId,
      success: false,
      error: String(e),
    });
    throw e;
  }
}

/**
 * Добавление гостя в существующую встречу + автоматическая отправка
 * приглашения по почте (sendUpdates: 'all' — Google сам шлёт приглашение).
 */
export async function addGuest(eventId: string, guestEmail: string): Promise<CalendarEvent> {
  try {
    const calendar = await calendarClient();
    const current = await calendar.events.get({ calendarId: "primary", eventId });
    const attendees = [...(current.data.attendees ?? [])];
    if (!attendees.some((a) => a.email?.toLowerCase() === guestEmail.toLowerCase())) {
      attendees.push({ email: guestEmail });
    }
    const res = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
      requestBody: { attendees },
    });
    const event = toEvent(res.data);
    await writeAuditLog({
      actor: "agent",
      action: "calendar.add_guest",
      target: eventId,
      details: { guestEmail },
    });
    return event;
  } catch (e) {
    await writeAuditLog({
      actor: "agent",
      action: "calendar.add_guest",
      target: eventId,
      details: { guestEmail },
      success: false,
      error: String(e),
    });
    throw e;
  }
}

/** Просмотр расписания на день/неделю. ТЗ 4.1 + 4.3 ("что у меня сегодня"). */
export async function listEvents(
  range: "day" | "week",
  fromDate?: string
): Promise<CalendarEvent[]> {
  const calendar = await calendarClient();
  const from = fromDate ? new Date(fromDate) : new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + (range === "week" ? 7 : 1));
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });
  return (res.data.items ?? []).map(toEvent);
}
