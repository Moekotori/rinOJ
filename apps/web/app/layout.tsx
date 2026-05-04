import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Noto_Sans_SC, Plus_Jakarta_Sans } from "next/font/google";
import messages from "../messages/zh-CN.json";
import { Providers } from "./providers";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontCJK = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cjk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rin OJ",
  description: "A professional online judge workspace for contests, problems, submissions, and judging operations.",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${fontSans.variable} ${fontCJK.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider locale="zh-CN" messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
