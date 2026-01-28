import { Editor } from "@tiptap/react";
import { StyleContext } from "../context/styleContext";
import type { ReactNode } from "react";

export function StyleBase({ editor, children }: { editor: Editor, children: ReactNode }) {
  return (
    <StyleContext.Provider value={{ editor }}>
      {children}
    </StyleContext.Provider>
  );
}