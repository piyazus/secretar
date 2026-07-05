// GET /api/onboarding/qr — проксирует QR-картинку WhatsApp из wa-bridge (ТЗ §4.5).
// Без логина: онбординг до входа владельца. Отдаёт PNG или 204, если уже привязан.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await fetch("http://wa-bridge:3080/qr.png", {
      signal: AbortSignal.timeout(6000),
    });
    // wa-bridge отдаёт 404, когда QR ещё не готов или номер уже привязан
    if (r.status === 404) return new Response(null, { status: 204 });
    if (!r.ok) return new Response("qr unavailable", { status: 502 });
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  } catch {
    return new Response("wa-bridge down", { status: 502 });
  }
}
