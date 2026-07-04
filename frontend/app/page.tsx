"use client";

// Чат-интерфейс директора (ТЗ §4.4 — текстовый и голосовой ввод).
// Тёмная тема, PWA-friendly (safe-area), подсказки для типовых команд.

import { useEffect, useRef, useState } from "react";

type Msg = {
  id: number;
  role: "user" | "assistant" | "error";
  text: string;
  time: string;
};

const SUGGESTIONS = [
  "Что у меня сегодня?",
  "Непрочитанные письма",
  "Создай встречу завтра в 10:00",
  "Сводка на неделю",
];

function now() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(1);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setMessages((m) => [
      ...m,
      { id: idRef.current++, role: "user", text: trimmed, time: now() },
    ]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          id: idRef.current++,
          role: "assistant",
          text: data.reply ?? "Пустой ответ",
          time: now(),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: idRef.current++,
          role: "error",
          text: "Не удалось получить ответ. Проверьте соединение и попробуйте ещё раз.",
          time: now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  const empty = messages.length === 0;

  return (
    <main
      className="flex h-[100dvh] flex-col bg-neutral-950 text-neutral-100"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <header className="flex items-center gap-3 border-b border-neutral-800/80 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-base font-bold text-neutral-50">
          S
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-wide">
            Secretar
          </h1>
          <p className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            онлайн · календарь и почта под контролем
          </p>
        </div>
        <span className="text-xs text-neutral-500">
          {new Date().toLocaleDateString("ru-RU", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
      </header>

      <div
        ref={listRef}
        className="chat-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {empty && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 text-2xl font-bold">
                S
              </div>
              <h2 className="text-lg font-semibold">Добрый день</h2>
              <p className="mt-1 max-w-xs text-sm text-neutral-400">
                Управляю вашим календарём и почтой. Спросите или поручите —
                текстом или голосом.
              </p>
            </div>
            <div className="flex max-w-sm flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800 active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`msg-in flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "rounded-br-md bg-blue-700 text-white"
                  : m.role === "assistant"
                    ? "rounded-bl-md bg-neutral-800 text-neutral-100"
                    : "rounded-bl-md border border-red-900/60 bg-red-950/40 text-red-200"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p
                className={`mt-1 text-right text-[10px] ${
                  m.role === "user" ? "text-blue-200/80" : "text-neutral-500"
                }`}
              >
                {m.time}
              </p>
            </div>
          </div>
        ))}

        {busy && (
          <div className="msg-in flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-neutral-800 px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
            </div>
          </div>
        )}
      </div>

      <footer
        className="border-t border-neutral-800/80 bg-neutral-950 px-3 py-3"
        style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <button
            type="button"
            title="Голосовой ввод (скоро)"
            aria-label="Голосовой ввод"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200 active:scale-95"
            onClick={() =>
              setMessages((m) => [
                ...m,
                {
                  id: idRef.current++,
                  role: "assistant",
                  text: "Голосовой ввод появится после подключения faster-whisper (фаза 2).",
                  time: now(),
                },
              ])
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="18" x2="12" y2="22" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            placeholder="Напишите команду…"
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow(e.target);
            }}
            onKeyDown={onKeyDown}
            className="max-h-[140px] min-h-[44px] flex-1 resize-none rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-[15px] text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-blue-600"
          />

          <button
            type="button"
            aria-label="Отправить"
            disabled={!input.trim() || busy}
            onClick={() => send(input)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white transition enabled:hover:bg-blue-600 enabled:active:scale-95 disabled:opacity-40"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </footer>
    </main>
  );
}
