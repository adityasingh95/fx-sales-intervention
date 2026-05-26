import { create } from 'zustand';

// Visual + audio notifications fire once per fresh SI deal (per
// docs/02 §5.1). The store tracks both the live toasts and the set of
// deals we've already notified for — re-Releasing a previously-picked-up
// deal back to dealable does NOT re-fire.

export type ToastKind = 'si';

export type Toast = {
  id: string;
  dealId: string;
  message: string;
  createdAt: number;
};

interface NotificationsState {
  toasts: Toast[];
  notifiedDealIds: Set<string>;
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  dismissToast: (id: string) => void;
  markNotified: (dealId: string) => void;
  hasNotified: (dealId: string) => boolean;
  reset: () => void;
}

let toastCounter = 0;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  toasts: [],
  notifiedDealIds: new Set<string>(),

  addToast: (toast) => {
    toastCounter += 1;
    const id = `t_${toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, createdAt: Date.now() }],
    }));
    return id;
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  markNotified: (dealId) => {
    set((state) => {
      const next = new Set(state.notifiedDealIds);
      next.add(dealId);
      return { notifiedDealIds: next };
    });
  },

  hasNotified: (dealId) => get().notifiedDealIds.has(dealId),

  reset: () => {
    set({ toasts: [], notifiedDealIds: new Set() });
  },
}));
