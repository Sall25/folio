import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { CellValue, DatabaseView, ID, Page } from "src/types";
import "./timeline-card-body.scss";
import { useResizableNode } from "../../../figure-node";
import { recordSelection } from "../../utils/record-selection-store";
import { ROW_HEIGHT } from "../../hooks/use-timeline-layout";

interface TimelineCardBodyProps {
  view: DatabaseView;
  record: Page;
  geo: { left: number; width: number };
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue,
  ) => void;
  clippedLeft?: boolean;
  clippedRight?: boolean;
  canResize?: boolean;
}

export function TimelineCardBody({
  view,
  record,
  clippedLeft,
  clippedRight,
  canResize,
}: TimelineCardBodyProps) {
  const { setTarget } = usePageView();
  const { handleResizeStart, isResizing, activeHandle } = useResizableNode();

  const onOpenRecord = (recordId: ID) => {
    if (view.openPageIn === "Center") {
      setTarget({ pageId: recordId, view: "Center" });
    } else if (view.openPageIn === "Side") {
      setTarget({ pageId: recordId, view: "Peek" });
    } else {
      setTarget({ pageId: recordId, view: "Full" });
    }
  };

  return (
    // inset: 0 alone stretches this to fill whatever width the parent
    // NodeViewWrapper CURRENTLY has — that's what makes it track live during
    // drag, since ResizableNodeProvider mutates the wrapper's width directly
    // via the DOM, not through React state. An explicit width/height here
    // (the previous geo.width/ROW_HEIGHT-2) overrides that stretch and
    // locks this box to a stale size until the next React render — which
    // during drag only happens after the drop, via the committed date
    // change. Same class of bug as the earlier overflow:hidden fix: a
    // property on this element silently overriding what the parent intends.
    <div
      className="db-tl-bar"
      style={{ position: "absolute", inset: 0, height: ROW_HEIGHT - 2 }}
      onClick={() => onOpenRecord(record.id)}
      onMouseEnter={() => recordSelection.setHovered(record.id)}
      onMouseLeave={() => recordSelection.setHovered(null)}
    >
      {clippedLeft && (
        <span
          className="db-tl-bar__connector db-tl-bar__connector--left"
          aria-hidden
        />
      )}

      <Button variant="ghost" className="db-tl-bar__content">
        <span className="db-tl-bar__icon">
          <DynamicIcon name={record.cover.iconName ?? undefined} size={14} />
        </span>
        <span className="tiptap-button-text db-tl-bar__title">
          {record.title}
        </span>
      </Button>

      {clippedRight && (
        <span
          className="db-tl-bar__connector db-tl-bar__connector--right"
          aria-hidden
        />
      )}
      {canResize && (
        <span
          className={
            "db-tl-bar__resize-handle" +
            (isResizing && activeHandle === "right"
              ? " db-tl-bar__resize-handle--active"
              : "")
          }
          data-is-resizing={isResizing}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleResizeStart?.(e, "right");
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            handleResizeStart?.(e, "right");
          }}
          onClick={(e) => e.stopPropagation()}
          aria-hidden
        />
      )}
    </div>
  );
}
