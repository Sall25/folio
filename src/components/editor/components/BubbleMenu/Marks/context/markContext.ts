import { Editor } from "@tiptap/react"
import { createContext, useContext } from "react";

type MarkContextType = {
  editor: Editor;
}

export const MarkContext = createContext<MarkContextType | null>(null);

export function useMarkContext() {
  const ctx = useContext(MarkContext);
  if (!ctx) {
    throw new Error('Mark item must be inside MarkMenu');
  }
  return ctx;
}