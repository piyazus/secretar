// lib/gmail/gmail.ts
// Gmail API — реализация под ТЗ раздел 4.2.
// Тот же OAuth2-клиент, что и Calendar (единый Google OAuth 2.0, ТЗ раздел 7).

import { google } from "googleapis";
import { getOAuthClient } from "../google/auth";
import { writeAuditLog } from "../audit";

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

async function gmailClient() {
  const auth = await getOAuthClient();
  return google.gmail({ version: "v1", auth });
}

function buildGmailQuery(filter: EmailFilter): string {
  const parts: string[] = [];
  if (filter.from) parts.push(`from:${filter.from}`);
  if (filter.subject) parts.push(`subject:(${filter.subject})`);
  if (filter.after) parts.push(`after:${filter.after.slice(0, 10).replace(/-/g, "/")}`);
  if (filter.before) parts.push(`before:${filter.before.slice(0, 10).replace(/-/g, "/")}`);
  if (filter.unreadOnly) parts.push("is:unread");
  return parts.join(" ");
}

function header(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Чтение писем с фильтром по отправителю/теме/дате. */
export async function readEmails(filter: EmailFilter): Promise<EmailSummary[]> {
  const gmail = await gmailClient();
  const list = await gmail.users.messages.list({
    userId: "me",
    q: buildGmailQuery(filter),
    maxResults: 20,
  });
  const ids = list.data.messages ?? [];
  const out: EmailSummary[] = [];
  for (const m of ids) {
    if (!m.id) continue;
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });
    out.push({
      id: m.id,
      from: header(msg.data.payload?.headers ?? undefined, "From"),
      subject: header(msg.data.payload?.headers ?? undefined, "Subject"),
      snippet: msg.data.snippet ?? "",
      date: header(msg.data.payload?.headers ?? undefined, "Date"),
      unread: (msg.data.labelIds ?? []).includes("UNREAD"),
    });
  }
  return out;
}

export interface SendEmailInput {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
}

function buildMimeMessage(input: SendEmailInput): string {
  const subject = `=?UTF-8?B?${Buffer.from(input.subject, "utf-8").toString("base64")}?=`;
  const lines = [
    `To: ${input.to.join(", ")}`,
    ...(input.cc?.length ? [`Cc: ${input.cc.join(", ")}`] : []),
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(input.body, "utf-8").toString("base64"),
  ];
  return Buffer.from(lines.join("\r\n"), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Написание и отправка письма по команде директора. */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  try {
    const gmail = await gmailClient();
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: buildMimeMessage(input) },
    });
    const id = res.data.id ?? "";
    await writeAuditLog({
      actor: "agent",
      action: "mail.send",
      target: input.to.join(","),
      details: { subject: input.subject, cc: input.cc },
    });
    return { id };
  } catch (e) {
    await writeAuditLog({
      actor: "agent",
      action: "mail.send",
      target: input.to.join(","),
      details: { subject: input.subject },
      success: false,
      error: String(e),
    });
    throw e;
  }
}

/**
 * Кастомное приглашение на встречу (обычно не нужно: calendar sendUpdates:'all'
 * рассылает приглашения сам; этот метод — для писем с индивидуальным текстом).
 */
export async function composeInvite(params: {
  guestEmail: string;
  eventTitle: string;
  startTime: string;
  location?: string;
}): Promise<{ id: string }> {
  const when = new Date(params.startTime).toLocaleString("ru-RU", {
    timeZone: process.env.TIMEZONE ?? "Asia/Almaty",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const body = [
    `Здравствуйте!`,
    ``,
    `Приглашаю вас на встречу «${params.eventTitle}» — ${when}.`,
    ...(params.location ? [`Место: ${params.location}.`] : []),
    ``,
    `Приглашение в календарь придёт отдельным письмом.`,
  ].join("\n");
  return sendEmail({
    to: [params.guestEmail],
    subject: `Приглашение: ${params.eventTitle}`,
    body,
  });
}
