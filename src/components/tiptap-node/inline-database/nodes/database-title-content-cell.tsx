import { useEffect, useRef, useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { NodeViewContent } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { usePage } from "src/hooks/use-pages";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import type { DatabaseView, ID } from "src/types";
import "./database-title-content-cell.scss";

/**
 * Option A title cell (Notion-style). The editable text IS the node's inline
 * content (NodeViewContent) — native, collaborative, ProseMirror-owned. The
 * icon and "Open" button are chrome around it.
 *
 * Notion behavior:
 *   - resting/hover: icon + text + Open (Open fades in on hover)
 *   - EDITING (focus inside the text): chrome hidden, just the text + cursor
 *
 * The editing state is tracked via focus/blur on the content wrapper.
 */
export function DatabaseTitleContentCell({
  pageId,
  templateId,
  view,
  readonly,
}: {
  pageId: ID | null;
  templateId?: ID;
  view?: DatabaseView;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data: linkedPage } = usePage(pageId ?? null);
  const { data: templatePage } = usePage(templateId ?? null);
  const { setActivePageId } = useActivePage();
  const { setTarget } = usePageView();

  const icon = templatePage?.cover ?? linkedPage?.cover ?? null;
  const hasPage = pageId != null;

  // Track whether the cursor/focus is inside this cell's editable text. When it
  // is, we're "editing" → hide the chrome (icon/Open), like Notion.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onFocusIn = () => setEditing(true);
    const onFocusOut = (e: FocusEvent) => {
      // Only leave editing if focus moved OUTSIDE this cell.
      if (!root.contains(e.relatedTarget as Node)) setEditing(false);
    };
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const onOpen = () => {
    if (!pageId || !view) return;

    if (view.openPageIn === "Side") {
      setTarget({ pageId, view: "Peek" });
    } else if (view.openPageIn === "Center") {
      setTarget({ pageId, view: "Center" });
    } else if (view.openPageIn === "Full") {
      setActivePageId(pageId);
    } else if (view.type === "gallery" || view.type === "board") {
      setTarget({ pageId, view: "Center" });
    } else {
      setTarget({ pageId, view: "Peek" });
    }
  };

  // Chrome is visible only when NOT editing.
  const showChrome = !editing;

  return (
    <div
      ref={rootRef}
      className="db-title-content"
      data-editing={editing ? "true" : "false"}
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {showChrome && icon && (
        <span className="db-title-content__icon" contentEditable={false}>
          <PageItemIcon cover={icon} styles={{ width: 17, height: 17 }} />
        </span>
      )}

      {/* The editable text — ProseMirror owns this. Always present (it's the
          node content); chrome comes and goes around it. */}
      <NodeViewContent
        as={"span" as unknown as "div"}
        className="db-title-content__text"
      />

      {showChrome && hasPage && !readonly && (
        <Button
          contentEditable={false}
          className="db-title-content__open"
          style={{
            opacity: hover ? 1 : 0,
          }}
          onMouseDown={(e) => {
            // Don't steal selection/focus from the editor on press.
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <PanelRightOpen className="tiptap-button-icon" size={12} />
          <span className="tiptap-button-text">Open</span>
        </Button>
      )}
    </div>
  );
}
