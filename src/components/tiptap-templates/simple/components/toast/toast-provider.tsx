import { useCallback, useState, type ReactNode } from "react";
import { X, WifiOff, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  ToastContext,
  type Toast,
  type ToastKind,
  type ToastAction,
} from "./toast-context";
import "./toast-provider.scss";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = "info", action?: ToastAction) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((t) => {
        if (t.some((x) => x.message === message && x.kind === kind)) return t;
        return [...t, { id, kind, message, action }];
      });
      // Toasts with an action (e.g. Undo) linger longer so it's tappable.
      const ttl = action
        ? 8000
        : kind === "network" || kind === "error"
          ? 6000
          : 3500;
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            <span className="toast__icon">
              {t.kind === "network" ? (
                <WifiOff size={16} />
              ) : t.kind === "error" ? (
                <AlertCircle size={16} />
              ) : t.kind === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
            </span>
            <span className="toast__message">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
