import { useState } from "react";
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
 * Option A title cell: the editable text IS the node's inline content
 * (NodeViewContent) — native, collaborative, ProseMirror-owned. The icon and
 * "Open" button are static chrome rendered AROUND that content span. This is
 * NOT the old TitleCell/TitleCellDisplay (which owned their own text via a
 * popover + draft state); here the text is ProseMirror's, so there is no
 * popover editor — you type directly inline.
 *
 * Page-link behavior (icon from linked page cover, Open routing) is preserved,
 * mirroring the old TitleCell.onOpen logic.
 */
export function DatabaseTitleContentCell({
  pageId,
  templateId,
  view,
  readonly,
}: {
  /** The row-page id (records are pages). */
  pageId: ID | null;
  /** Parent database templateId — title uses it for the template icon. */
  templateId?: ID;
  view?: DatabaseView;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const { data: linkedPage } = usePage(pageId ?? null);
  const { data: templatePage } = usePage(templateId ?? null);
  const { setActivePageId } = useActivePage();
  const { setTarget } = usePageView();

  const icon = templatePage?.cover ?? linkedPage?.cover ?? null;
  const hasPage = pageId != null;

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

  return (
    <div
      className="db-title-content"
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {icon && (
        <span className="db-title-content__icon" contentEditable={false}>
          <PageItemIcon cover={icon} styles={{ width: 17, height: 17 }} />
        </span>
      )}

      {/* The editable text — ProseMirror owns this. */}
      <NodeViewContent
        as={"span" as unknown as "div"}
        className="db-title-content__text"
      />

      {hasPage && !readonly && (
        <Button
          contentEditable={false}
          className="db-title-content__open"
          style={{
            minHeight: 24,
            height: 24,
            fontSize: 14,
            minWidth: 68,
            alignItems: "center",
            borderRadius: "var(--tt-radius-sm)",
            background: "var(--tt-bg-color)",
            cursor: "pointer",
            border: "1px solid var(--tt-border-color)",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.15s ease",
            flexShrink: 0,
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
