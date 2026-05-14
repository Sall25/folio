// thread-sidebar.tsx
import type { Editor } from "@tiptap/core";
import { ThreadSidebarBase } from "./thread-sidebar-base";
import { ThreadsList } from "./threads-list";
import { useEffect, useState } from "react";
import type { PositionedThread } from "../types";
import { getCommentThreadState } from "../extensions/utils/getCommentThreadState";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import { useThreadsOnPage } from "../hooks/use-threads-on-page";
import { useEditorRefs } from "src/components/tiptap-templates/simple/context/editor-refs-context";
import { commentThreadPluginKey } from "../extensions/comment-thread-extension";
import "./styles.scss";
import "./thread-sidebar.scss";

// Shell — no heavy hooks, always mounted
export function ThreadSidebar({
  editor,
  setHasThreads,
}: {
  editor: Editor | null;
  setHasThreads: (v: boolean) => void;
}) {
  const { activePageId: pageId } = useActivePage();

  return (
    <ThreadSidebarBase editor={editor} setHasThreads={setHasThreads}>
      <div className="thread-sidebar">
        {/* Thread sync isolated — re-renders don't affect parent */}
        <ThreadSidebarInner editor={editor} pageId={pageId} />
      </div>
    </ThreadSidebarBase>
  );
}

// Inner — all heavy hooks live here
function ThreadSidebarInner({
  editor,
  pageId,
}: {
  editor: Editor | null;
  pageId: number | undefined;
}) {
  const [positionedThreads, setPositionedThreads] = useState<
    PositionedThread[]
  >([]);
  const refsRef = useEditorRefs();
  const threads = useThreadsOnPage(pageId);

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

  useEffect(() => {
    if (!editor) return;
    if (!threads.threads) return;

    editor.view.dispatch(
      editor.state.tr.setMeta(commentThreadPluginKey, {
        type: "initialThreads",
        providedThreads: threads.threads ?? [],
      }),
    );
  }, [editor, pageId, threads.threads, threads.isLoading]);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const state = getCommentThreadState(editor);
      if (!state) return;
      setPositionedThreads(state.positionedThreads);
    };

    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  return (
    <ThreadsList
      pageId={pageId ?? 0}
      positionedThreads={positionedThreads}
      editor={editor}
    />
  );
}
