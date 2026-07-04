// lib/gmail/gmail.ts
// Gmail API — заглушки под ТЗ раздел 4.2.
// TODO: реализовать через googleapis (google.gmail('v1')) с тем же OAuth2 клиентом,
// что и Calendar (единый Google OAuth 2.0, ТЗ раздел 7).

export interface EmailFilter {
  from?: string;
  subject?: string;
  after?: string; // ISO date
  before?: string; // ISO date
  unreadOnly?: boolean;
}

export interface EmailSummary {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

/** Чтение писем с фильтром по отправителю/теме/дате. */
export async function readEmails(filter: EmailFilter): Promise<EmailSummary[]> {
  // TODO: gmail.users.messages.list({ userId: 'me', q: buildGmailQuery(filter) })
  throw new Error("readEmails: не реализовано");
}

export interface SendEmailInput {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
}

/** Написание и отправка письма по команде директора. */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  // TODO: gmail.users.messages.send({ userId: 'me', requestBody: { raw: buildMimeMessage(input) } })
  // TODO: writeAuditLog({ action: 'mail.send', target: input.to.join(','), details: { subject: input.subject } })
  throw new Error("sendEmail: не реализовано");
}

/**
 * Автоматическое составление приглашения на встречу при добавлении гостя
 * (вызывается из lib/calendar/googleCalendar.addGuest, либо напрямую через
 * calendar sendUpdates: 'all' — этот метод для случаев, когда нужен кастомный текст).
 */
export async function composeInvite(params: {
  guestEmail: string;
  eventTitle: string;
  startTime: string;
  location?: string;
}): Promise<{ id: string }> {
  // TODO: собрать тело письма (LLM Sonnet может сгенерировать текст приглашения
  // в стиле директора — см. lib/llm) и отправить через sendEmail()
  throw new Error("composeInvite: не реализовано");
}
