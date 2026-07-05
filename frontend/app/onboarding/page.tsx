"use client";

// Онбординг-мастер первого запуска (ТЗ §4.6) — открывается инсталлятором.
// Живой статус подключений + карточки Telegram / WhatsApp QR / Google / тест.

import { useEffect, useState } from "react";

type Status = {
  anthropic: boolean;
  google_oauth_configured: boolean;
  google_connected: boolean;
  owner_email: string | null;
  telegram: boolean;
  whatsapp: "connected" | "waiting_qr" | "down";
  app_url: string | null;
};

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        ok ? "bg-emerald-500" : "bg-neutral-600"
      }`}
    />
  );
}

function Card({
  title,
  ok,
  children,
}: {
  title: string;
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Dot ok={ok} />
        <h3 className="text-base font-semibold text-neutral-100">{title}</h3>
        <span className="ml-auto text-xs text-neutral-500">
          {ok ? "готово" : "нужно настроить"}
        </span>
      </div>
      <div className="text-sm leading-relaxed text-neutral-300">{children}</div>
    </div>
  );
}

export default function Onboarding() {
  const [s, setS] = useState<Status | null>(null);
  const [qrTick, setQrTick] = useState(0);

  async function load() {
    try {
      const r = await fetch("/api/onboarding/status", { cache: "no-store" });
      setS(await r.json());
    } catch {
      /* пусто */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    const q = setInterval(() => setQrTick((n) => n + 1), 20000);
    return () => {
      clearInterval(t);
      clearInterval(q);
    };
  }, []);

  const allDone =
    s && s.anthropic && s.google_connected && s.telegram;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-neutral-100">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 text-2xl font-bold">
          S
        </div>
        <h1 className="text-2xl font-semibold">Настройка Secretar</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Подключите сервисы — статус обновляется автоматически.
        </p>
        {s?.app_url && (
          <p className="mt-1 text-xs text-neutral-500">{s.app_url}</p>
        )}
      </div>

      {!s && <p className="text-center text-neutral-500">Загрузка статуса…</p>}

      {s && (
        <div className="space-y-4">
          <Card title="Ключ Anthropic (мозг ассистента)" ok={s.anthropic}>
            {s.anthropic ? (
              "Ключ на месте — LLM работает."
            ) : (
              <>
                Впишите <code>ANTHROPIC_API_KEY</code> в файл{" "}
                <code>.env</code> в папке установки и перезапустите стек
                (Docker Desktop → Restart, либо перезагрузка ПК).
                Ключ берётся на console.anthropic.com.
              </>
            )}
          </Card>

          <Card title="Google — Календарь и Почта" ok={s.google_connected}>
            {s.google_connected ? (
              <>Подключён владелец: {s.owner_email}.</>
            ) : s.google_oauth_configured ? (
              <>
                Войдите под аккаунтом-владельцем, чтобы дать доступ к календарю
                и почте:
                <a
                  href="/api/auth/signin"
                  className="mt-3 block rounded-xl bg-white px-4 py-2 text-center font-medium text-neutral-900 transition hover:bg-neutral-200"
                >
                  Войти через Google
                </a>
              </>
            ) : (
              <>
                Сначала задайте <code>GOOGLE_CLIENT_ID</code>,{" "}
                <code>GOOGLE_CLIENT_SECRET</code> и <code>OWNER_EMAIL</code> в{" "}
                <code>.env</code> (см. инструкцию), затем перезапустите стек.
              </>
            )}
          </Card>

          <Card title="Telegram-бот" ok={s.telegram}>
            {s.telegram ? (
              "Бот подключён — пишите ему в Telegram."
            ) : (
              <>
                Создайте бота в @BotFather (3 шага), выключите privacy mode,
                впишите <code>TELEGRAM_BOT_TOKEN</code> в <code>.env</code> и
                перезапустите стек.
              </>
            )}
          </Card>

          <Card
            title="WhatsApp (по желанию)"
            ok={s.whatsapp === "connected"}
          >
            {s.whatsapp === "connected" ? (
              "Номер привязан — секретарь отвечает в WhatsApp."
            ) : s.whatsapp === "waiting_qr" ? (
              <div className="flex flex-col items-center gap-3">
                <p>Отсканируйте QR телефоном: WhatsApp → Связанные устройства.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={qrTick}
                  src={`/api/onboarding/qr?t=${qrTick}`}
                  alt="WhatsApp QR"
                  className="h-56 w-56 rounded-lg bg-white p-2"
                />
                <p className="text-xs text-amber-400/80">
                  ⚠️ Неофициальный протокол — Meta может заблокировать номер,
                  используйте на свой риск.
                </p>
              </div>
            ) : (
              "Сервис WhatsApp запускается… (или пропустите этот шаг)."
            )}
          </Card>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
            <h3 className="mb-2 text-base font-semibold">Проверка</h3>
            <p className="text-sm text-neutral-300">
              {allDone
                ? "Всё готово. Откройте чат и напишите «Что ты умеешь?»."
                : "Когда основные пункты станут зелёными, откройте чат."}
            </p>
            <a
              href="/"
              className={`mt-3 block rounded-xl px-4 py-2 text-center font-medium transition ${
                allDone
                  ? "bg-blue-700 text-white hover:bg-blue-600"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              Открыть чат
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
