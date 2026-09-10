import type { GalleryView } from "src/types";
import "./database-gallery-node-view.scss";
import { memo, useCallback, useEffect, useRef } from "react";
import { useDatabaseContext } from "./database-context";
import { NodeViewContent, useCurrentEditor } from "@tiptap/react";
import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DragStorage } from "../extensions";
import {
  beforeGalleryCardAtPoint,
  hideGalleryDropIndicator,
  showGalleryDropIndicator,
  showGalleryEndIndicator,
} from "../extensions/utils";

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

  const autoScroll = useCallback((x: number, y: number) => {
    const scroller = document.querySelector<HTMLElement>(".db-node");
    if (!scroller) return;

    const r = scroller.getBoundingClientRect();
    let dx = 0;
    if (x < r.left + EDGE) dx = -SPEED;
    else if (x > r.right - EDGE) dx = SPEED;

    let dy = 0;
    if (y < EDGE) dy = -SPEED;
    else if (y > window.innerHeight - EDGE) dy = SPEED;

    if (dx === 0 && dy === 0) {
      if (scrollRAF.current) {
        cancelAnimationFrame(scrollRAF.current);
        scrollRAF.current = null;
      }
      return;
    }
    if (scrollRAF.current) return;

    const step = () => {
      scroller.scrollLeft += dx;
      if (dy !== 0) window.scrollBy(0, dy);
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

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".db-node");
    if (!scroller) return;
    const onOver = (e: DragEvent) => {
      const storage = editor?.storage.boardDrag as DragStorage;
      if (!storage.draggingId) return;
      e.preventDefault();
      autoScroll(e.clientX, e.clientY);
    };
    scroller.addEventListener("dragover", onOver);
    return () => scroller.removeEventListener("dragover", onOver);
  }, [editor, autoScroll]);

  return (
    <div
      className="db-board-grid"
      data-database-id={attrs.id}
      style={{
        display: "grid",
        width: "var(--db-editor-width)",
        gridTemplateColumns: `repeat(auto-fill, minmax(${colWidth}px, 1fr))`,
        alignItems: "start",
        gap: "8px",
        position: "relative",
      }}
      onDragOver={(event) => {
        if (!editor) return;

        const storage = editor.storage.boardDrag as DragStorage;

        if (!storage.draggingId) return;

        event.preventDefault();

        autoScroll(event.clientX, event.clientY);

        const gallery = event.currentTarget;
        const draggingId = storage.draggingId;

        const beforeRecordId = beforeGalleryCardAtPoint(
          gallery,
          event.clientX,
          event.clientY,
          draggingId,
        );

        if (beforeRecordId) {
          const card = gallery.querySelector<HTMLElement>(
            `[data-type="database-record"][data-record-id="${beforeRecordId}"]`,
          );

          if (card) {
            showGalleryDropIndicator(gallery, card);
            return;
          }
        }

        // `null` means we're dropping after the final visual card.
        showGalleryEndIndicator(gallery);
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
          margin: "8px 10px",
          order: sortedRecords.length + 1,
        }}
        onClick={onNewRecord}
      >
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">New Page</span>
      </Button>
    </div>
  );
}

export const DatabaseGalleryNodeView = memo(DatabaseGalleryNodeViewImpl);
