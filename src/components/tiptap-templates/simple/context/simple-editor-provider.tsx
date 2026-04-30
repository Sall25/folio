import { useActivePage } from "../use-active-page";
import { usePages } from "../use-pages";
import { useThreadsOnPage } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SimpleEditorContext } from "./simple-editor-context";
import { useVersions } from "src/components/tiptap-ui/version-history/use-versions";
import { ThreadProvider } from "./thread-provider";
import { VersionProvider } from "./version-provider";
import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import { ActivePageProvider } from "./active-page-provider";
import { useEditorRefs } from "./editor-refs-context";

interface SimpleEditorProviderProps {
  children: ReactNode;
}

export function SimpleEditorProvider({ children }: SimpleEditorProviderProps) {
  const refsRef = useEditorRefs();
  const activePage = useActivePage();
  const { addPageAsync, isLoading } = usePages();
  const threads = useThreadsOnPage(activePage.activePageId);
  const versions = useVersions(activePage.activePageId);

  const { setTocContent } = useToc();

  // keep refs current — extensions always call latest versions
  useEffect(() => {
    refsRef.current.setActivePageId = activePage.setActivePageId;
  }, [activePage.setActivePageId, refsRef]);

  useEffect(() => {
    refsRef.current.setTocContent = setTocContent;
  }, [setTocContent, refsRef]);

  useEffect(() => {
    refsRef.current.threads = threads.threads;
    refsRef.current.createThreadAsync = threads.createThreadAsync;
    refsRef.current.deleteThreadAsync = threads.deleteThreadAsync;
    refsRef.current.resolveThreadAsync = threads.resolveThreadAsync;
    refsRef.current.unresolveThreadAsync = threads.unresolveThreadAsync;
    refsRef.current.addCommentsAsync = threads.addCommentsAsync;
    refsRef.current.removeCommentsAsync = threads.removeCommentsAsync;
    refsRef.current.updateCommentAsync = threads.updateCommentAsync;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  const threadContextValue = useMemo(() => ({ ...threads }), [threads]);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const onVersionHistoryOpenChanged = useCallback((v: boolean) => {
    setVersionHistoryOpen(v);
  }, []);
  const versionContextValue = useMemo(
    () => ({ ...versions, versionHistoryOpen, onVersionHistoryOpenChanged }),
    [versions, versionHistoryOpen, onVersionHistoryOpenChanged],
  );

  const simpleEditorContextValue = useMemo(
    () => ({
      ...activePage,
      addPageAsync,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePage.activePage, activePage.pages, isLoading, addPageAsync],
  );

  return (
    <ActivePageProvider>
      <ThreadProvider threads={threadContextValue}>
        <VersionProvider versions={versionContextValue}>
          <SimpleEditorContext.Provider value={simpleEditorContextValue}>
            {children}
          </SimpleEditorContext.Provider>
        </VersionProvider>
      </ThreadProvider>
    </ActivePageProvider>
  );
}
