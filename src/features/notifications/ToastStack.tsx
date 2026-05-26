import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useNotificationsStore, type Toast } from '@/state/stores/notificationsStore';
import { useUiStore } from '@/state/stores/uiStore';

const AUTO_DISMISS_MS = 6000;

// docs/02 §5.2 — toast appears top-right, auto-dismisses at 6s, click
// opens the ticket. Renders nothing when there are no toasts.

export default function ToastStack() {
  const toasts = useNotificationsStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div
      data-testid="toast-stack"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useNotificationsStore((s) => s.dismissToast);
  const openTicket = useUiStore((s) => s.openTicket);

  useEffect(() => {
    const id = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [toast.id, dismiss]);

  return (
    <button
      type="button"
      data-testid={`toast-${toast.dealId}`}
      data-toast-id={toast.id}
      onClick={() => {
        openTicket(toast.dealId);
        dismiss(toast.id);
      }}
      className="pointer-events-auto flex w-80 items-start gap-2 rounded-md border border-ai-border bg-bg-glass px-3 py-2.5 text-left text-sm text-text shadow-ai backdrop-blur-xl hover:border-ai-accent"
    >
      <span className="flex-1 leading-base">{toast.message}</span>
      <span
        role="button"
        tabIndex={-1}
        aria-label="Dismiss notification"
        onClick={(e) => {
          e.stopPropagation();
          dismiss(toast.id);
        }}
        className="-mr-1 -mt-1 inline-flex h-6 w-6 items-center justify-center rounded-sm text-text-mute transition-colors hover:bg-bg-row-hover hover:text-text"
      >
        <X size={14} aria-hidden />
      </span>
    </button>
  );
}
