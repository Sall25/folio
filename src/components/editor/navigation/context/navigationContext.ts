import { createContext, useContext } from "react";
import { type NavigationContextType } from "./types";

export const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('Navigation item must be inside <Navigation />');
  }
  return ctx;
}