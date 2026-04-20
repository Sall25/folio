import type { Editor } from "@tiptap/core";
import { ThreadSidebarBase } from "./thread-sidebar-base";
import { ThreadsList } from "./threads-list";
import { useEffect, useState } from "react";
import type { PositionedThread } from "../types";
import { getCommentThreadState } from "../extensions/utils/getCommentThreadState";

import "./styles.scss";
import "./thread-sidebar.scss";

export function ThreadSidebar({
  editor,
  setHasThreads,
  pageId,
}: {
  editor: Editor | null;
  setHasThreads: (v: boolean) => void;
  pageId: string;
}) {
  const [positionedThreads, setPositionedThreads] = useState<
    PositionedThread[]
  >([]);

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
    <ThreadSidebarBase editor={editor} setHasThreads={setHasThreads}>
      <div className="thread-sidebar">
        <ThreadsList
          pageId={pageId}
          positionedThreads={positionedThreads}
          editor={editor}
        />
      </div>
    </ThreadSidebarBase>
  );
}
