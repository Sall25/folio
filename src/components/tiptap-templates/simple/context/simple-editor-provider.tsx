import { useActivePage } from "../use-active-page";
import { usePages } from "../use-pages";
import { useThreadsOnPage } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { SimpleEditorContext } from "./simple-editor-context";
import { useActivePageId } from "./active-page-context";
import { useVersions } from "src/components/tiptap-ui/version-history/use-versions";
import { useEditorSetup } from "../hooks/use-editor-setup";
import { EditorContext } from "@tiptap/react";

interface SimpleEditorProviderProps {
  children: ReactNode;
}

export function SimpleEditorProvider({ children }: SimpleEditorProviderProps) {
  const { activePageId } = useActivePageId();
  const activePage = useActivePage();
  const { addPageAsync, isLoading } = usePages();
  const threads = useThreadsOnPage(activePageId);
  const versions = useVersions(activePageId);

  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const onVersionHistoryOpenChanged = useCallback((v: boolean) => {
    setVersionHistoryOpen(v);
  }, []);

  const content = useMemo(
    () => activePage.activePage?.content ?? "<p></p>",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePageId],
  );

  const { editor } = useEditorSetup({ content });

  const providedEditor = useMemo(() => ({ editor }), [editor]);

  const simpleEditorContextValue = useMemo(
    () => ({
      ...activePage,
      addPageAsync,
      ...threads,
      ...versions,
      versionHistoryOpen,
      onVersionHistoryOpenChanged,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activePage.activePage,
      isLoading,
      addPageAsync,
      threads,
      versions,
      versionHistoryOpen,
      onVersionHistoryOpenChanged,
    ],
  );

  return (
    <EditorContext.Provider value={providedEditor}>
      <SimpleEditorContext.Provider value={simpleEditorContextValue}>
        {children}
      </SimpleEditorContext.Provider>
    </EditorContext.Provider>
  );
}
