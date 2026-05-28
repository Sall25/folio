import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/react";

const PeekEditorContext = createContext<Editor | null>(null);

export const PeekEditorProvider = PeekEditorContext.Provider;

export function usePeekEditor(): Editor | null {
  return useContext(PeekEditorContext);
}
