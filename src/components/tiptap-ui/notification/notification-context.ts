import { createContext } from "react";
import type { NotificationContextValue } from "./types.js";

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);
