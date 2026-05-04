"use client";

import { UserRoundCog } from "lucide-react";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";

export function WorkspaceControls() {
  const { actorId, displayName, isAuthenticated, accountRole, setActorId } = useSessionStore();
  const { t } = useTranslation();
  const identityText = isAuthenticated ? displayName || actorId : actorId;
  const normalizedIdentity = identityText.toLowerCase();
  const inferredRole =
    normalizedIdentity.includes("teacher") || accountRole === "admin" ? "teacher" : "student";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="rin-icon-tile h-10 w-10 [&>svg]:h-5 [&>svg]:w-5">
        <UserRoundCog strokeWidth={2.25} />
      </span>
      <div className="min-w-0 text-sm">
        <div className="font-bold tracking-tight text-slate-900">{t("workspace.currentIdentity")}</div>
        <div className="text-[13px] font-medium text-slate-500">{inferredRole === "teacher" ? t("workspace.teacher") : t("workspace.student")}</div>
      </div>
      <div className="rin-filter-field flex min-w-[12rem] flex-1 sm:max-w-xs">
        <input
          aria-label={t("workspace.currentIdentity")}
          className="min-w-0 flex-1 text-sm font-semibold text-slate-800"
          title={t("workspace.currentIdentity")}
          value={actorId}
          onChange={(event) => setActorId(event.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
