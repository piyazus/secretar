// NextAuth route handler (App Router).
// Обрабатывает /api/auth/* включая /api/auth/callback/google —
// redirect URI, зарегистрированный в Google Cloud Console.

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
