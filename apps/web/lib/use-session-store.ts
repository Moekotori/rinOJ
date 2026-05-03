"use client";

import { create } from "zustand";

type SessionState = {
  actorId: string;
  role: "teacher" | "student";
  setActorId: (actorId: string) => void;
  setRole: (role: "teacher" | "student") => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  actorId: "usr_teacher",
  role: "teacher",
  setActorId: (actorId) => set({ actorId }),
  setRole: (role) => set({ role, actorId: role === "teacher" ? "usr_teacher" : "usr_student" }),
}));
