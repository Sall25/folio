import { useMemo, useRef, type ReactNode } from "react";
import { useEditor } from "@tiptap/react";
import { useEditorExtensions } from "../hooks/use-editor-extensions";
import { EditorContext } from "@tiptap/react";
import { EditorRefsContext } from "./editor-refs-context";
import type { EditorExtensionRefs } from "./editor-extension-refs";
import { useWhyDidYouRender } from "src/lib/useWhyDidYouRender";

const EDITOR_ATTRIBUTES = {
  autocomplete: "off",
  autocorrect: "off",
  autocapitalize: "off",
  spellcheck: "false",
  "aria-label": "Main content area, start typing to enter text.",
  class: "simple-editor",
};

export function EditorProvider({ children }: { children: ReactNode }) {
  const refsRef = useRef<EditorExtensionRefs>({
    setTocContent: () => {},
    setActivePageId: () => {},
    threads: [],
  });

  const { extensions } = useEditorExtensions(refsRef);

  const editor = useEditor({
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions,
    shouldRerenderOnTransaction: false,
    content: "<p></p>",
  });

  const providedEditor = useMemo(() => ({ editor }), [editor]);

  useWhyDidYouRender("editor-provider", {
    extensions,
    editor,
    providedEditor,
    refsRef,
  });

  return (
    <EditorRefsContext.Provider value={refsRef}>
      <EditorContext.Provider value={providedEditor}>
        {children}
      </EditorContext.Provider>
    </EditorRefsContext.Provider>
  );
}
