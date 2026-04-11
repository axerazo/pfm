// ============================================================
// Session store — transient UI state that must survive
// component mount/unmount but resets on page refresh.
// ============================================================

import { create } from 'zustand'

interface SessionState {
  /** Register UUIDs the user has explicitly unlocked this session. */
  unlockedRegisters: Set<string>
  addUnlockedRegister: (id: string) => void
  removeUnlockedRegister: (id: string) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  unlockedRegisters: new Set(),
  addUnlockedRegister: (id) =>
    set((state) => ({
      unlockedRegisters: new Set([...state.unlockedRegisters, id]),
    })),
  removeUnlockedRegister: (id) =>
    set((state) => {
      const next = new Set(state.unlockedRegisters)
      next.delete(id)
      return { unlockedRegisters: next }
    }),
}))
