"use client";

import { useEffect } from "react";

// Регистрация service worker для PWA («Добавить на экран» на телефоне).
export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW не критичен для работы чата — молча игнорируем (например, http без TLS)
      });
    }
  }, []);
  return null;
}
