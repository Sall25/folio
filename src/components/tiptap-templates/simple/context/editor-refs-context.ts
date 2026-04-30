import { createContext, useContext } from "react";
import type { EditorExtensionRefs } from "./editor-extension-refs";
export const EditorRefsContext = createContext<
  React.RefObject<EditorExtensionRefs>
>(null!);

export function useEditorRefs() {
  return useContext(EditorRefsContext);
}
