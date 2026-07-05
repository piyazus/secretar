// middleware.ts
// Весь веб-чат закрыт логином (ТЗ §5): без сессии — редирект на страницу входа.
// Исключения: сами эндпоинты NextAuth, PWA-статика, внутренний /api/agent
// (защищён INTERNAL_API_TOKEN, только docker-сеть) и онбординг-мастер
// (/onboarding + /api/onboarding — идёт ДО входа владельца, ТЗ §4.6).

export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!api/auth|api/agent|api/onboarding|onboarding|manifest.json|sw.js|offline.html|icons|_next/static|_next/image|favicon.ico).*)",
  ],
};
