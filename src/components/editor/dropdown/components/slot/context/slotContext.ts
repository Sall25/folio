import { createContext, type ReactNode } from "react"

type SlotContextType = {
  register: (name: string, node: ReactNode) => void;
}

export const SlotContext = createContext<SlotContextType | null>(null);