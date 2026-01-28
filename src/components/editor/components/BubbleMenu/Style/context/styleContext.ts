import { Editor } from "@tiptap/react"
import { createContext, useContext } from "react";

type StyleContextType = {
  editor: Editor;
}

export const StyleContext = createContext<StyleContextType | null>(null);

export function useStyleContext() {
  const ctx = useContext(StyleContext);
  if (!ctx) {
    throw new Error('Style item must be under <StyleDropdown />');
  }
  return ctx;
}