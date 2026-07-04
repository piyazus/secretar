// frontend/lib/auth.ts
// NextAuth: вход ТОЛЬКО через Google-аккаунт владельца (ТЗ §5 — безопасность).
// При первом входе сохраняем OAuth-токены Google в Postgres (google_tokens),
// чтобы lib/calendar и lib/gmail могли работать от имени владельца.

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { saveTokens } from "@lib/google/auth";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: SCOPES,
          access_type: "offline", // refresh_token для фоновой работы
          prompt: "consent", // гарантирует выдачу refresh_token
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // Пускаем только владельца (единственный разрешённый аккаунт, ТЗ §5).
    async signIn({ user }) {
      const owner = process.env.OWNER_EMAIL?.toLowerCase();
      if (!owner) {
        console.error("OWNER_EMAIL не задан в .env — вход запрещён всем.");
        return false;
      }
      return user.email?.toLowerCase() === owner;
    },
    async jwt({ token, account, user }) {
      // Первый вход: account содержит токены Google — сохраняем локально в БД.
      if (account && user?.email) {
        try {
          await saveTokens({
            email: user.email,
            access_token: account.access_token ?? null,
            refresh_token: account.refresh_token ?? null,
            expiry_date: account.expires_at ? account.expires_at * 1000 : null,
          });
        } catch (e) {
          console.error("Не удалось сохранить Google-токены:", e);
        }
      }
      return token;
    },
  },
};
