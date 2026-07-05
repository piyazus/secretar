// GET /api/onboarding/status — статус подключений для мастера онбординга (ТЗ §4.6).
// Доступен без логина (онбординг идёт до входа владельца), но только чтение
// булевых флагов — секреты наружу не отдаются.

import { NextResponse } from "next/server";
import { query } from "@lib/db";

// Читаем process.env и БД на каждый запрос — не кешировать на этапе сборки.
export const dynamic = "force-dynamic";

async function telegramOk(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(5000),
    });
    const d = await r.json();
    return Boolean(d.ok);
  } catch {
    return false;
  }
}

async function waStatus(): Promise<"connected" | "waiting_qr" | "down"> {
  try {
    const r = await fetch("http://wa-bridge:3080/status", {
      signal: AbortSignal.timeout(4000),
    });
    const d = await r.json();
    return d.connected ? "connected" : "waiting_qr";
  } catch {
    return "down";
  }
}

async function googleConnected(): Promise<boolean> {
  try {
    const { rows } = await query<{ n: string }>(
      "SELECT count(*)::text AS n FROM google_tokens WHERE refresh_token IS NOT NULL"
    );
    return Number(rows[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  const [tg, wa, google] = await Promise.all([
    telegramOk(process.env.TELEGRAM_BOT_TOKEN),
    waStatus(),
    googleConnected(),
  ]);

  return NextResponse.json(
    {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      google_oauth_configured: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
      google_connected: google,
      owner_email: process.env.OWNER_EMAIL ?? null,
      telegram: tg,
      telegram_bot: tg ? null : "нет токена или бот недоступен",
      whatsapp: wa,
      app_url: process.env.NEXTAUTH_URL ?? null,
    },
    { headers: { "cache-control": "no-store, no-cache, must-revalidate" } }
  );
}
