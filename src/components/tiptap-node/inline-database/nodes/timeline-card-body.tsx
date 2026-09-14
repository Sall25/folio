import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { CellValue, DatabaseView, ID, Page } from "src/types";

interface TimelineCardBodyProps {
  view: DatabaseView;
  record: Page;
  geo: { left: number; width: number };
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue,
  ) => void;
}

export function TimelineCardBody({ view, record }: TimelineCardBodyProps) {
  const { setTarget } = usePageView();

  const onOpenRecord = (recordId: ID) => {
    if (view.openPageIn === "Center") {
      setTarget({ pageId: recordId, view: "Center" });
    } else if (view.openPageIn === "Side") {
      setTarget({ pageId: recordId, view: "Peek" });
    } else {
      setTarget({ pageId: recordId, view: "Full" });
    }
  };

  // left/width are already applied to the NodeViewWrapper that hosts this
  // component (see DatabaseRecordNodeView's isTimeline branch) — this just
  // fills that positioned box. Setting them again here was the double-offset
  // bug: the wrapper shifted the box right, then the card shifted again.
  return (
    <Card
      className="db-tl-bar"
      style={{ position: "absolute", inset: 0 }}
      onClick={() => onOpenRecord(record.id)}
    >
      <Button variant="ghost">
        <DynamicIcon name={record.cover.iconName ?? undefined} size={18} />
        <span className="tiptap-button-text">{record.title}</span>
      </Button>
    </Card>
  );
}
