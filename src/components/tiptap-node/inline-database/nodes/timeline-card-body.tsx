import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { CellValue, DatabaseView, ID, Page } from "src/types";
import "./timeline-card-body.scss";
import { ROW_HEIGHT } from "../hooks/use-timeline-layout";
import { useResizableNode } from "../../figure-node";

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
  geo,
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

  // Plain div, not <Card> — Card clips its children internally (an inner
  // wrapper we don't have visibility into) and that clipping survived
  // overriding overflow both via className and inline style on the outer
  // element, meaning it's not reachable from outside. .db-tl-bar below
  // already supplies the background/radius/hover Card would have given us,
  // so there's nothing lost by not using it here.
  return (
    <div
      className="db-tl-bar"
      style={{
        position: "absolute",
        inset: 0,
        width: geo.width,
        height: ROW_HEIGHT - 1,
      }}
      onClick={() => onOpenRecord(record.id)}
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
