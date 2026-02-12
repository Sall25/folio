import { Editor } from "@tiptap/react";
import { MarkContext } from "../context/markContext";
import type { ReactNode } from "react";

export function MarkBase({ editor, children }: { editor: Editor, children: ReactNode }) {
  return (
    <MarkContext.Provider
      value={{ editor }}
    >
      <div className="flex items-center gap-3">
        {children}
      </div>
    </MarkContext.Provider>
  )
}