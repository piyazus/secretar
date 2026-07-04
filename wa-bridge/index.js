// wa-bridge — WhatsApp QR-линк личного номера через Baileys (ТЗ §4.5, v2.0).
// ВНИМАНИЕ (из ТЗ): неофициальный протокол, Meta может заблокировать номер.
//
// Эндпоинты:
//   GET  /qr     — страница с QR для привязки (автообновление)
//   GET  /qr.png — сам QR как PNG
//   GET  /status — {connected, hasQr}
//   POST /send   — {to, text} → отправить сообщение
// Входящие сообщения уходят POST-ом на N8N_WA_WEBHOOK (n8n-роутер).

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import http from "node:http";

const PORT = Number(process.env.WA_PORT ?? 3080);
const AUTH_DIR = process.env.WA_AUTH_DIR ?? "/data/auth";
const N8N_WA_WEBHOOK = process.env.N8N_WA_WEBHOOK ?? "http://n8n:5678/webhook/wa";

const logger = pino({ level: process.env.WA_LOG_LEVEL ?? "warn" });

let sock = null;
let latestQr = null; // строка QR, пока не привязан
let connected = false;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQr = qr;
      logger.warn("Новый QR готов — откройте /qr для привязки");
    }
    if (connection === "open") {
      connected = true;
      latestQr = null;
      logger.warn("WhatsApp подключён");
    }
    if (connection === "close") {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        logger.error("Номер отвязан (logged out) — нужна повторная привязка по QR");
        latestQr = null;
      }
      // Переподключение с небольшой паузой
      setTimeout(() => startSock().catch((e) => logger.error(e)), 3000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;
        const jid = msg.key.remoteJid ?? "";
        if (jid === "status@broadcast") continue;
        const m = msg.message;
        const text =
          m.conversation ??
          m.extendedTextMessage?.text ??
          m.imageMessage?.caption ??
          m.videoMessage?.caption ??
          "";
        if (!text.trim()) continue;
        const payload = {
          channel: "wa",
          from: jid,
          text: text.trim(),
          pushName: msg.pushName ?? "",
          isGroup: jid.endsWith("@g.us"),
        };
        const res = await fetch(N8N_WA_WEBHOOK, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) logger.error(`n8n webhook HTTP ${res.status}`);
      } catch (e) {
        logger.error(e, "Ошибка обработки входящего сообщения");
      }
    }
  });
}

function json(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/status") {
    return json(res, 200, { connected, hasQr: Boolean(latestQr) });
  }

  if (req.method === "GET" && url.pathname === "/qr.png") {
    if (!latestQr) return json(res, 404, { error: connected ? "уже подключено" : "QR ещё не готов" });
    const png = await QRCode.toBuffer(latestQr, { width: 400, margin: 2 });
    res.writeHead(200, { "content-type": "image/png", "cache-control": "no-store" });
    return res.end(png);
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/qr")) {
    const body = connected
      ? "<h2>✅ WhatsApp подключён</h2><p>Можно закрыть эту страницу.</p>"
      : latestQr
        ? `<h2>Привяжите WhatsApp</h2>
           <p>Телефон → WhatsApp → Настройки → Связанные устройства → Привязать устройство</p>
           <img src="/qr.png" alt="QR" width="320" height="320">
           <p style="color:#888">QR обновляется автоматически. ⚠️ Неофициальный способ — Meta может заблокировать номер.</p>`
        : "<h2>⏳ Генерируется QR…</h2>";
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(
      `<!doctype html><meta http-equiv="refresh" content="10"><body style="font-family:sans-serif;background:#111;color:#eee;display:flex;flex-direction:column;align-items:center;padding-top:8vh">${body}</body>`
    );
  }

  if (req.method === "POST" && url.pathname === "/send") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      const { to, text } = JSON.parse(raw);
      if (!to || !text) return json(res, 400, { error: "нужны to и text" });
      if (!sock || !connected) return json(res, 503, { error: "WhatsApp не подключён" });
      const jid = String(to).includes("@") ? String(to) : `${to}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: String(text) });
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 500, { error: String(e) });
    }
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`wa-bridge на :${PORT} (QR: /qr)`));
startSock().catch((e) => {
  console.error("Не удалось запустить Baileys:", e);
  process.exit(1);
});
