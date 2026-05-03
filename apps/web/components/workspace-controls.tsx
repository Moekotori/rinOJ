"use client";

import { UserRoundCog } from "lucide-react";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";

export function WorkspaceControls() {
  const { actorId, role, setActorId } = useSessionStore();
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/65 px-4 py-3 shadow-[0_10px_28px_rgba(58,45,88,0.12)] backdrop-blur">
      <UserRoundCog className="h-5 w-5 text-slate-600" />
      <div className="text-sm">
        <div className="font-semibold text-slate-900">{t("workspace.currentIdentity")}</div>
        <div className="text-slate-500">{role === "teacher" ? t("workspace.teacher") : t("workspace.student")}</div>
      </div>
      <input className="min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={actorId} onChange={(event) => setActorId(event.target.value)} />
    </div>
  );
}
