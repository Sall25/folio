import { useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X, WifiOff, AlertCircle, CheckCircle2 } from "src/components/icons";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  ToastContext,
  type Toast,
  type ToastKind,
  type ToastAction,
} from "./toast-context";
import "./toast-provider.scss";

// Toasts: centred at the bottom of the screen, newest at the bottom, each a
// Card (the app's floating surface) with an icon, the message, an optional
// action (Undo…) and ×.
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = "info", action?: ToastAction) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((list) => {
        if (list.some((x) => x.message === message && x.kind === kind))
          return list;
        return [...list, { id, kind, message, action }];
      });
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
      <div className="toast-viewport" aria-live="polite">
        {toasts.map((toast) => (
          <Card
            key={toast.id}
            className={`toast toast--${toast.kind}`}
            role="status"
          >
            <span className="toast__icon" aria-hidden="true">
              {toast.kind === "network" ? (
                <WifiOff size={16} />
              ) : toast.kind === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
            </span>
            <span className="toast__message">{toast.message}</span>
            {toast.action && (
              <Button
                type="button"
                variant="ghost"
                className="toast__action"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                <span className="tiptap-button-text">{toast.action.label}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="toast__close"
              aria-label={t("actions.close", "Close")}
              onClick={() => dismiss(toast.id)}
            >
              <X className="tiptap-button-icon" size={14} />
            </Button>
          </Card>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
