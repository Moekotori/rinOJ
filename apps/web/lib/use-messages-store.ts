"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DirectMessage = {
  id: string;
  conversationId: string;
  fromUser: string;
  toUser: string;
  body: string;
  createdAt: number;
};

function conversationId(a: string, b: string): string {
  const x = a.trim();
  const y = b.trim();
  return x <= y ? `${x}::${y}` : `${y}::${x}`;
}

function newId(): string {
  return `dm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

type MessagesState = {
  items: DirectMessage[];
  send: (currentUser: string, toUsername: string, body: string) => void;
  threadWith: (currentUser: string, peerUsername: string) => DirectMessage[];
  peersFor: (currentUser: string) => Array<{ peer: string; lastAt: number; preview: string }>;
};

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      items: [],
      send: (currentUser, toUsername, body) => {
        const trimmed = body.trim();
        const from = currentUser.trim();
        const to = toUsername.trim();
        if (!trimmed || !from || !to || from === to) {
          return;
        }
        const cid = conversationId(from, to);
        const msg: DirectMessage = {
          id: newId(),
          conversationId: cid,
          fromUser: from,
          toUser: to,
          body: trimmed,
          createdAt: Date.now(),
        };
        set((s) => ({ items: [...s.items, msg] }));
      },
      threadWith: (currentUser, peerUsername) => {
        const me = currentUser.trim();
        const peer = peerUsername.trim();
        const cid = conversationId(me, peer);
        return get()
          .items.filter((m) => m.conversationId === cid)
          .sort((a, b) => a.createdAt - b.createdAt);
      },
      peersFor: (currentUser) => {
        const me = currentUser.trim();
        const byPeer = new Map<string, DirectMessage>();
        for (const m of get().items) {
          if (m.fromUser !== me && m.toUser !== me) {
            continue;
          }
          const peer = m.fromUser === me ? m.toUser : m.fromUser;
          const prev = byPeer.get(peer);
          if (!prev || m.createdAt > prev.createdAt) {
            byPeer.set(peer, m);
          }
        }
        return [...byPeer.entries()]
          .map(([peer, last]) => ({
            peer,
            lastAt: last.createdAt,
            preview: last.body.length > 80 ? `${last.body.slice(0, 80)}…` : last.body,
          }))
          .sort((a, b) => b.lastAt - a.lastAt);
      },
    }),
    {
      name: "rin-direct-messages",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
