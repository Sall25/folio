import { createContext } from "react";
interface ToastContextValue {
  visible: boolean;
  show: () => void;
}

export const ToastContext = createContext<ToastContextValue>({
  visible: false,
  show: () => {},
});
