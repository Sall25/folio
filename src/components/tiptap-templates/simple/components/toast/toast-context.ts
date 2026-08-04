import { createContext, useContext } from "react";

export type ToastKind = "error" | "network" | "success" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind, action?: ToastAction) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  return (
    useContext(ToastContext) ?? {
      show: () => {
        /* no provider mounted — no-op */
      },
    }
  );
}
