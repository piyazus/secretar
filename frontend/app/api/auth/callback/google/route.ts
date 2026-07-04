// GET /api/auth/callback/google — OAuth 2.0 redirect handler.
// redirect_uri должен точно совпадать со значением, указанным в Google Cloud
// Console (OAuth Client ID) и в GOOGLE_REDIRECT_URI (.env).

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  // TODO: обменять code на access_token/refresh_token через googleapis OAuth2Client,
  // сохранить токены в postgres (таблица director_tokens — добавить миграцию).
  return NextResponse.json({ received: Boolean(code) });
}
