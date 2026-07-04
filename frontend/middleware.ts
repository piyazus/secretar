// middleware.ts
// Весь веб-чат закрыт логином (ТЗ §5): без сессии — редирект на страницу входа.
// Исключения: сами эндпоинты NextAuth, PWA-статика и внутренний /api/agent
// (он защищён токеном INTERNAL_API_TOKEN и доступен только из docker-сети).

export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!api/auth|api/agent|manifest.json|sw.js|offline.html|icons|_next/static|_next/image|favicon.ico).*)",
  ],
};
