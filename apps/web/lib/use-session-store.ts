"use client";

import { create } from "zustand";
import type { AuthSessionResponse } from "./types";

const sessionStorageKey = "rin-session";

export type AccountRole = "student" | "admin";
export type IntakeRole = "teacher" | "student";

type SessionState = {
  actorId: string;
  /** Problem-intake wizard persona (teacher vs student flow). */
  intakeRole: IntakeRole;
  /** Platform role from login / user-service (student vs admin). */
  accountRole: AccountRole;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  displayName: string;
  avatarUrl: string;
  setActorId: (actorId: string) => void;
  setIntakeRole: (role: IntakeRole) => void;
  setAccountProfile: (profile: { displayName?: string; accountRole?: string; avatarUrl?: string }) => void;
  setAuthSession: (session: AuthSessionResponse, displayName?: string) => void;
  setAvatarUrl: (avatarUrl: string) => void;
  signOut: () => void;
};

type LooseAuthSessionResponse = AuthSessionResponse & {
  user_id?: string;
  access_token?: string;
  refresh_token?: string;
};

type LegacyPersisted = Partial<SessionState> & {
  /** @deprecated migrated to intakeRole */
  role?: IntakeRole;
};

function normalizeAccountRole(raw: string | undefined): AccountRole {
  if (raw?.toLowerCase().trim() === "admin") {
    return "admin";
  }
  return "student";
}

function readSavedSession(): LegacyPersisted | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem(sessionStorageKey) ?? "null") as LegacyPersisted | null;
  } catch {
    return null;
  }
}

function saveSession(
  session: Pick<
    SessionState,
    "actorId" | "accessToken" | "refreshToken" | "displayName" | "isAuthenticated" | "avatarUrl" | "accountRole" | "intakeRole"
  >,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(sessionStorageKey);
}

const savedSession = readSavedSession();
const activeSavedSession = savedSession?.actorId === "usr_teacher" && !savedSession.isAuthenticated ? null : savedSession;
const migratedIntakeRole: IntakeRole =
  activeSavedSession?.intakeRole ?? activeSavedSession?.role ?? "teacher";
const anonymousActorId = "anonymous";
const anonymousDisplayName = "Visitor";

export const useSessionStore = create<SessionState>((set) => ({
  actorId: activeSavedSession?.actorId ?? anonymousActorId,
  intakeRole: migratedIntakeRole,
  accountRole: activeSavedSession?.accountRole ?? "student",
  accessToken: activeSavedSession?.accessToken ?? null,
  refreshToken: activeSavedSession?.refreshToken ?? null,
  isAuthenticated: activeSavedSession?.isAuthenticated ?? false,
  displayName: activeSavedSession?.displayName ?? anonymousDisplayName,
  avatarUrl: activeSavedSession?.avatarUrl ?? "",
  setActorId: (actorId) => set({ actorId }),
  setIntakeRole: (intakeRole) =>
    set((current) => {
      const nextSession = {
        actorId: current.actorId,
        accessToken: current.accessToken,
        refreshToken: current.refreshToken,
        displayName: current.displayName,
        isAuthenticated: current.isAuthenticated,
        avatarUrl: current.avatarUrl,
        accountRole: current.accountRole,
        intakeRole,
      };
      saveSession(nextSession);
      return { intakeRole };
    }),
  setAccountProfile: (profile) =>
    set((current) => {
      const nextSession = {
        actorId: current.actorId,
        accessToken: current.accessToken,
        refreshToken: current.refreshToken,
        displayName: profile.displayName?.trim() || current.displayName,
        isAuthenticated: current.isAuthenticated,
        avatarUrl: profile.avatarUrl ?? current.avatarUrl,
        accountRole: profile.accountRole === undefined ? current.accountRole : normalizeAccountRole(profile.accountRole),
        intakeRole: current.intakeRole,
      };
      saveSession(nextSession);
      return nextSession;
    }),
  setAuthSession: (session, displayName) => {
    const looseSession = session as LooseAuthSessionResponse;
    const userId = looseSession.userId ?? looseSession.user_id ?? displayName ?? "usr_user";
    const accessToken = looseSession.accessToken ?? looseSession.access_token ?? "";
    const refreshToken = looseSession.refreshToken ?? looseSession.refresh_token ?? "";
    const accountRole = normalizeAccountRole(looseSession.role);

    set((current) => {
      const nextSession = {
        actorId: userId,
        accessToken,
        refreshToken,
        displayName: displayName || userId,
        isAuthenticated: true,
        avatarUrl: current.avatarUrl,
        accountRole,
        intakeRole: current.intakeRole,
      };
      saveSession(nextSession);
      return nextSession;
    });
  },
  setAvatarUrl: (avatarUrl) =>
    set((current) => {
      const nextSession = {
        actorId: current.actorId,
        accessToken: current.accessToken,
        refreshToken: current.refreshToken,
        displayName: current.displayName,
        isAuthenticated: current.isAuthenticated,
        avatarUrl,
        accountRole: current.accountRole,
        intakeRole: current.intakeRole,
      };
      saveSession(nextSession);
      return { avatarUrl };
    }),
  signOut: () => {
    clearSession();
    set((current) => ({
      actorId: anonymousActorId,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      displayName: anonymousDisplayName,
      avatarUrl: "",
      accountRole: "student",
      intakeRole: current.intakeRole,
    }));
  },
}));
