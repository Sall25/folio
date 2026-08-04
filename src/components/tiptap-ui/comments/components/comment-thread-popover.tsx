import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/core";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { commentThreadPluginKey } from "../extensions";
import { ThreadContent } from "./thread-content";
import "./comment-thread-popover.scss";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { useThreadsByPage } from "src/hooks/use-threads";

// Popover display mode for inline comments. Instead of positioned sidebar
// cards, clicking a commented span (a [data-thread-id] element) opens the thread
// in a popover anchored to that span. Used on mobile/tablet (where the sidebar
// gutter doesn't fit) and as an optional desktop mode.
//
// Mount this once alongside the editor when commentDisplayMode === "popover".
// It listens for clicks on comment decorations and opens the matching thread.
export function CommentThreadPopover({ editor }: { editor: Editor | null }) {
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const { activePageId } = useActivePage();
  const { data: threads = [] } = useThreadsByPage(activePageId);

  // Click a commented span → open its thread's popover, anchored to the span.
  useEffect(() => {
    if (!editor) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const span = target.closest<HTMLElement>("[data-thread-id]");
      if (!span) return;
      const threadId = span.getAttribute("data-thread-id");
      if (!threadId) return;

      setOpenThreadId(threadId);
      setAnchorRect(span.getBoundingClientRect());

      // Activate the thread in the plugin (highlights the decoration).
      editor.view.dispatch(
        editor.state.tr.setMeta(commentThreadPluginKey, {
          type: "selectThread",
          threadId,
        }),
      );
    };

    const dom = editor.view.dom;
    dom.addEventListener("click", onClick);
    return () => dom.removeEventListener("click", onClick);
  }, [editor]);

  const close = useCallback(() => {
    setOpenThreadId(null);
    setAnchorRect(null);
    if (editor) {
      const sel = editor.state.selection.from;
      editor.view.dispatch(
        editor.state.tr.setMeta(commentThreadPluginKey, {
          type: "unselectThread",
          threadId: openThreadId,
        }),
      );
      void sel;
    }
  }, [editor, openThreadId]);

  const thread = threads.find((t) => t.id === openThreadId);
  if (!editor || !openThreadId || !anchorRect || !thread) return null;

  return (
    <Popover
      open={true}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      {/* A virtual anchor at the clicked span's rect. */}
      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={6}
          style={{
            position: "fixed",
            top: anchorRect.bottom,
            left: anchorRect.left,
            zIndex: 9999,
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Card className="comment-thread-popover">
            <ThreadContent thread={thread} editor={editor} onDeleted={close} />
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
