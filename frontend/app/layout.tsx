import "./globals.css";
import SwRegister from "./sw-register";
import type { Viewport } from "next";

export const metadata = {
  title: "Secretar",
  description: "Персональный ИИ-секретарь директора фонда",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent" as const,
    title: "Secretar",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
