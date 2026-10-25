import type { GalleryView } from "src/types";
import "./database-gallery-node-view.scss";
import { memo, useCallback, useEffect, useRef } from "react";
import { useDatabaseContext } from "../../context/database-context";
import { NodeViewContent, useCurrentEditor } from "@tiptap/react";
import { Plus } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DragStorage } from "../../extensions";
import {
  galleryDropTarget,
  hideGalleryDropIndicator,
  showGalleryDropIndicator,
} from "../../extensions/utils";

const CARD_SIZE_WIDTH: Record<"small" | "medium" | "large", number> = {
  small: 200,
  medium: 300,
  large: 350,
};

function DatabaseGalleryNodeViewImpl() {
  const { db, attrs, onNewRecord, sortedRecords } = useDatabaseContext();
  const activeView = db.activeView as GalleryView;
  const cardSize = activeView?.cardSize ?? "medium";
  const colWidth = CARD_SIZE_WIDTH[cardSize];

  const { editor } = useCurrentEditor();
  const EDGE = 60;
  const SPEED = 14;
  const scrollRAF = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Dragging near the top or bottom of the page scrolls it. The page scrolls
  // in .simple-editor-main, not the window (window.scrollBy did nothing), so
  // a card couldn't be dragged to a spot below the screen.
  const autoScroll = useCallback((y: number) => {
    const scroller = rootRef.current?.closest<HTMLElement>(
      ".simple-editor-main",
    );
    if (!scroller) return;

    const r = scroller.getBoundingClientRect();
    let dy = 0;
    if (y < r.top + EDGE) dy = -SPEED;
    else if (y > r.bottom - EDGE) dy = SPEED;

    if (dy === 0) {
      if (scrollRAF.current) {
        cancelAnimationFrame(scrollRAF.current);
        scrollRAF.current = null;
      }
      return;
    }
    if (scrollRAF.current) return;

    const step = () => {
      scroller.scrollTop += dy;
      scrollRAF.current = requestAnimationFrame(step);
    };
    scrollRAF.current = requestAnimationFrame(step);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollRAF.current) {
      cancelAnimationFrame(scrollRAF.current);
      scrollRAF.current = null;
    }
  }, []);

  // Keep scrolling while the pointer is anywhere over the page (it may leave
  // the gallery to reach the edge). This database's own scroller, not the
  // first .db-node on the page.
  useEffect(() => {
    const scroller = rootRef.current?.closest<HTMLElement>(
      ".simple-editor-main",
    );
    if (!scroller) return;
    const onOver = (e: DragEvent) => {
      const storage = editor?.storage.boardDrag as DragStorage | undefined;
      if (!storage?.draggingId) return;
      autoScroll(e.clientY);
    };
    scroller.addEventListener("dragover", onOver);
    return () => {
      scroller.removeEventListener("dragover", onOver);
      stopAutoScroll();
    };
  }, [editor, autoScroll, stopAutoScroll]);

  return (
    <div
      ref={rootRef}
      className="db-board-grid db-gallery"
      data-database-id={attrs.id}
      style={{ "--db-gallery-min": `${colWidth}px` } as React.CSSProperties}
      onDragOver={(event) => {
        if (!editor) return;

        const storage = editor.storage.boardDrag as DragStorage;

        if (!storage.draggingId) return;

        event.preventDefault();
        // The same calculation the drop uses (board-drag.ts), so the line
        // always shows where the card will land.
        const gallery = event.currentTarget;
        const target = galleryDropTarget(
          gallery,
          event.clientX,
          event.clientY,
          storage.draggingId,
        );
        showGalleryDropIndicator(gallery, target.card, target.side);
      }}
      onDragLeave={(event) => {
        const gallery = event.currentTarget as HTMLElement;
        const related = event.relatedTarget as Node | null;

        if (related && gallery.contains(related)) {
          return;
        }

        hideGalleryDropIndicator(gallery);
      }}
      onDrop={(event) => {
        stopAutoScroll();
        const gallery = event.currentTarget;

        hideGalleryDropIndicator(gallery);
      }}
      onDragEnd={stopAutoScroll}
    >
      <div className="db-gallery-drop-indicator" />

      {/* Cards — PM record nodes, each self-places via grid-column + grid-row */}
      <NodeViewContent as="div" className="db-board-grid__body" />

      <Button
        type="button"
        className="db-new-card--gallery"
        contentEditable={false}
        style={{
          order: sortedRecords.length + 1,
        }}
        onClick={onNewRecord}
      >
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">New page</span>
      </Button>
    </div>
  );
}

export const DatabaseGalleryNodeView = memo(DatabaseGalleryNodeViewImpl);
