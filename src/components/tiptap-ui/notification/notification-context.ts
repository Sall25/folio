import { createContext } from "react";
import type { NotificationContextValue } from "src/types";

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);
