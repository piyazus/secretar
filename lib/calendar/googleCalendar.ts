// lib/calendar/googleCalendar.ts
// Google Calendar API — заглушки под ТЗ раздел 4.1.
// Все действия должны логироваться в audit_log (ТЗ раздел 5): actor, action, target, details.
// TODO: реализовать через googleapis (google.calendar('v3')) с OAuth2 клиентом
// из GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / токенов пользователя из БД.

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

/** Создание встречи. ТЗ 4.1: тема, время, участники, локация/ссылка. */
export async function createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  // TODO: calendar.events.insert({ calendarId: 'primary', requestBody: {...} })
  // TODO: writeAuditLog({ action: 'calendar.create', actor, target: event.id, details: input })
  throw new Error("createEvent: не реализовано");
}

/** Перенос встречи на новое время. */
export async function rescheduleEvent(
  eventId: string,
  newStart: string,
  newEnd: string
): Promise<CalendarEvent> {
  // TODO: calendar.events.patch({ calendarId: 'primary', eventId, requestBody: { start, end } })
  // TODO: writeAuditLog({ action: 'calendar.reschedule', ... })
  throw new Error("rescheduleEvent: не реализовано");
}

/** Удаление встречи. */
export async function deleteEvent(eventId: string): Promise<void> {
  // TODO: calendar.events.delete({ calendarId: 'primary', eventId })
  // TODO: writeAuditLog({ action: 'calendar.delete', ... })
  throw new Error("deleteEvent: не реализовано");
}

/**
 * Добавление гостя в существующую встречу + автоматическая отправка
 * приглашения по почте (см. lib/gmail — composeInvite вызывается автоматически
 * при sendUpdates: 'all').
 */
export async function addGuest(eventId: string, guestEmail: string): Promise<CalendarEvent> {
  // TODO: calendar.events.patch с добавлением в attendees[] и sendUpdates: 'all'
  // TODO: writeAuditLog({ action: 'calendar.add_guest', target: eventId, details: { guestEmail } })
  throw new Error("addGuest: не реализовано");
}

/** Просмотр расписания на день/неделю. ТЗ 4.1 + 4.3 ("что у меня сегодня"). */
export async function listEvents(range: "day" | "week", fromDate?: string): Promise<CalendarEvent[]> {
  // TODO: calendar.events.list({ calendarId: 'primary', timeMin, timeMax })
  throw new Error("listEvents: не реализовано");
}
