"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FavoritesState = {
  ids: string[];
  toggle: (problemId: string) => void;
  has: (problemId: string) => boolean;
  remove: (problemId: string) => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (problemId) =>
        set((s) => ({
          ids: s.ids.includes(problemId) ? s.ids.filter((id) => id !== problemId) : [...s.ids, problemId],
        })),
      has: (problemId) => get().ids.includes(problemId),
      remove: (problemId) => set((s) => ({ ids: s.ids.filter((id) => id !== problemId) })),
    }),
    {
      name: "rin-favorite-problems",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ids: s.ids }),
    },
  ),
);
