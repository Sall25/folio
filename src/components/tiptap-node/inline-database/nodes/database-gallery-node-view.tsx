import type { GalleryView } from "src/types";
import "./database-gallery-node-view.scss";
import { memo } from "react";
import { useDatabaseContext } from "./database-context";
import { NodeViewContent } from "@tiptap/react";
import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";

const CARD_SIZE_WIDTH: Record<"small" | "medium" | "large", number> = {
  small: 200,
  medium: 300,
  large: 350,
};

function DatabaseGalleryNodeViewImpl() {
  const { db, attrs, onNewRecord } = useDatabaseContext();
  const activeView = db.activeView as GalleryView;
  const cardSize = activeView?.cardSize ?? "medium";
  const colWidth = CARD_SIZE_WIDTH[cardSize];

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
      }}
    >
      {/* Cards — PM record nodes, each self-places via grid-column + grid-row */}
      <NodeViewContent as="div" className="db-board-grid__body" />

      <Button
        type="button"
        className="db-new-card--gallery"
        contentEditable={false}
        style={{
          margin: "8px 10px",
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
