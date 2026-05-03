import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import messages from "../messages/zh-CN.json";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rin OJ",
  description: "A modern anime-inspired online judge workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <NextIntlClientProvider locale="zh-CN" messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
