import { Editor } from "@tiptap/react"
import { createContext, useContext, type RefObject } from "react";

type StyleContextType = {
  editor: Editor;
  setShouldShow?: (b: boolean) => void;
  shouldShow?: boolean;
  shouldShowRef?: RefObject<boolean | null>;
}

export const StyleContext = createContext<StyleContextType | null>(null);

export function useStyleContext() {
  const ctx = useContext(StyleContext);
  if (!ctx) {
    throw new Error('Style item must be under <StyleDropdown />');
  }
  return ctx;
}