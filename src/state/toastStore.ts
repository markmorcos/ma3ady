import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'warning' | 'danger';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs: number;
};

type ToastStore = {
  toasts: Toast[];
  show: (toast: { kind?: ToastKind; message: string; durationMs?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: ({ kind = 'info', message, durationMs = 4000 }) => {
    const id = `t${++counter}`;
    const toast: Toast = { id, kind, message, durationMs };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (durationMs > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, durationMs);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
