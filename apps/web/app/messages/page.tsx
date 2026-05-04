"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { OJShell } from "@/components/oj-shell";
import { useMessagesStore } from "@/lib/use-messages-store";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";

function MessagesPageInner() {
  const { locale, t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const withUser = searchParams.get("with")?.trim() ?? "";
  const actorId = useSessionStore((s) => s.actorId);
  const displayName = useSessionStore((s) => s.displayName);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const currentUserKey = (displayName.trim() || actorId).trim();

  const send = useMessagesStore((s) => s.send);
  const threadWith = useMessagesStore((s) => s.threadWith);
  const peersFor = useMessagesStore((s) => s.peersFor);

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const thread = useMemo(
    () => (withUser && currentUserKey ? threadWith(currentUserKey, withUser) : []),
    [currentUserKey, threadWith, withUser],
  );

  const inbox = useMemo(() => (currentUserKey ? peersFor(currentUserKey) : []), [currentUserKey, peersFor]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, withUser]);

  const handleSend = () => {
    if (!isAuthenticated || !withUser || withUser === currentUserKey) {
      return;
    }
    send(currentUserKey, withUser, draft);
    setDraft("");
  };

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 border-b border-pink-100/40 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {withUser ? (
                <Link
                  href={`/users/${encodeURIComponent(withUser)}`}
                  className="rin-soft-button inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm font-bold"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {t("messages.backToProfile")}
                </Link>
              ) : (
                <Link href="/" className="rin-soft-button inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm font-bold">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {t("messages.backHome")}
                </Link>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <span className="rin-icon-tile rin-icon-tile--pink">
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {t("messages.title")}
                </div>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950">
                  {withUser ? `${t("messages.with")} ${withUser}` : t("messages.inbox")}
                </h1>
              </div>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="px-5 py-12 text-center text-sm font-medium text-slate-600">
              <p>{t("messages.loginHint")}</p>
              <Link
                className="mt-4 inline-flex rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-md"
                href={`/login?next=${encodeURIComponent(withUser ? `/messages?with=${encodeURIComponent(withUser)}` : "/messages")}`}
              >
                {locale === "zh-CN" ? "去登录" : "Go to login"}
              </Link>
            </div>
          ) : withUser ? (
            <div className="grid gap-0">
              {withUser === currentUserKey ? (
                <p className="px-5 py-8 text-center text-sm font-medium text-slate-500">{t("messages.selfHint")}</p>
              ) : (
                <>
                  <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto px-5 py-4">
                    {thread.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">{t("messages.emptyThread")}</p>
                    ) : (
                      thread.map((m) => {
                        const mine = m.fromUser === currentUserKey;
                        return (
                          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                mine
                                  ? "bg-gradient-to-b from-pink-600 to-pink-700 text-white"
                                  : "border border-slate-200/90 bg-slate-50 text-slate-800"
                              }`}
                            >
                              <div className="text-[11px] font-bold opacity-80">{mine ? t("messages.you") : m.fromUser}</div>
                              <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
                              <div className={`mt-1 text-[10px] font-semibold ${mine ? "text-pink-100" : "text-slate-400"}`}>
                                {new Date(m.createdAt).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>
                  <div className="border-t border-pink-100/50 bg-gradient-to-b from-white to-slate-50/80 p-4">
                    <div className="flex gap-2">
                      <textarea
                        className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-pink-300"
                        placeholder={t("messages.placeholder")}
                        rows={2}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-2 text-sm font-black text-white shadow-md disabled:opacity-40"
                        disabled={!draft.trim()}
                        onClick={handleSend}
                      >
                        <Send className="h-4 w-4" aria-hidden />
                        {t("messages.send")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100/90">
              {inbox.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-slate-500">{t("messages.inboxEmpty")}</p>
              ) : (
                inbox.map((row) => (
                  <button
                    key={row.peer}
                    type="button"
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-pink-50/50"
                    onClick={() => router.push(`/messages?with=${encodeURIComponent(row.peer)}`)}
                  >
                    <span className="rin-icon-tile rin-icon-tile--sky mt-0.5 h-10 w-10 shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                      <MessageCircle aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-black text-slate-900">{row.peer}</span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{row.preview}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                      {new Date(row.lastAt).toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US")}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </OJShell>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoadingFallback />}>
      <MessagesPageInner />
    </Suspense>
  );
}

function MessagesLoadingFallback() {
  return (
    <OJShell>
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-500">…</div>
    </OJShell>
  );
}
