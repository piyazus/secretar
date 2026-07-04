// lib/google/auth.ts
// Единый OAuth2-клиент Google (Calendar + Gmail, ТЗ §7).
// Токены владельца сохраняются в Postgres (google_tokens, миграция 003)
// при первом входе через NextAuth и далее обновляются по refresh_token.

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { query } from "../db";

export interface StoredTokens {
  email: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
}

/** Сохранение/обновление токенов владельца (вызывается из NextAuth jwt callback). */
export async function saveTokens(t: StoredTokens): Promise<void> {
  await query(
    `INSERT INTO google_tokens (email, access_token, refresh_token, expiry_date, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (email) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, google_tokens.refresh_token),
       expiry_date = EXCLUDED.expiry_date,
       updated_at = now()`,
    [t.email, t.access_token, t.refresh_token, t.expiry_date]
  );
}

export async function loadTokens(email: string): Promise<StoredTokens | null> {
  const { rows } = await query<StoredTokens>(
    `SELECT email, access_token, refresh_token, expiry_date::bigint AS expiry_date
     FROM google_tokens WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

/**
 * OAuth2-клиент с токенами владельца. Автообновление access_token по
 * refresh_token делает googleapis сам; обновлённые значения пишем обратно в БД.
 */
export async function getOAuthClient(email?: string): Promise<OAuth2Client> {
  const owner = email ?? process.env.OWNER_EMAIL;
  if (!owner) throw new Error("OWNER_EMAIL не задан в .env");

  const stored = await loadTokens(owner);
  if (!stored?.refresh_token) {
    throw new Error(
      `Google-токены для ${owner} не найдены. Владелец должен один раз войти через веб-чат (NextAuth Google).`
    );
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  client.setCredentials({
    access_token: stored.access_token ?? undefined,
    refresh_token: stored.refresh_token,
    expiry_date: stored.expiry_date ?? undefined,
  });
  client.on("tokens", (tokens) => {
    void saveTokens({
      email: owner,
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
    });
  });
  return client;
}
