import { useOpenRecord } from "../../hooks/use-open-record";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import type {
  CellValue,
  DatabaseProperty,
  DatabaseView,
  Page,
} from "src/types";
import { Cell } from "../../components/cells/cell";
import "./timeline-card-body.scss";
import { useResizableNode } from "src/components/tiptap-node/resizable-node";
import { recordSelection } from "../../utils/record-selection-store";

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
  /** The properties shown after the name, in the view's column order. */
  otherProps?: DatabaseProperty[];
  /** Every property, for the cells that read their neighbours (relations). */
  properties?: DatabaseProperty[];
}

export function TimelineCardBody({
  view,
  record,
  clippedLeft,
  clippedRight,
  canResize,
  otherProps,
  properties,
  setCellValue,
}: TimelineCardBodyProps) {
  const onOpenRecord = useOpenRecord(view);
  const { handleResizeStart, isResizing, activeHandle } = useResizableNode();

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
      style={{
        position: "absolute",
        inset: 0,
        height: "100%",
        border: "1.5px solid var(--tt-border-color)",
      }}
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
          <DynamicIcon name={record.cover.iconName ?? undefined} size={16} />
        </span>
        <span className="tiptap-button-text db-tl-bar__title">
          {record.title}
        </span>
      </Button>

      {/* After the name, on the same line, and out past the bar with it: a
          card is as wide as the days it covers, which says nothing about how
          much there is to read. Outside the button — these are cells, not
          part of what opens the record. */}
      {otherProps && otherProps.length > 0 && (
        <div className="db-tl-bar__props" onClick={(e) => e.stopPropagation()}>
          {otherProps.map((p) => (
            <Cell
              key={p.id}
              property={p}
              value={(record.values?.[p.id] ?? null) as CellValue | null}
              record={record}
              onChange={(v) => setCellValue(record.id, p.id, v)}
              view={view}
              properties={properties ?? otherProps}
            />
          ))}
        </div>
      )}

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
