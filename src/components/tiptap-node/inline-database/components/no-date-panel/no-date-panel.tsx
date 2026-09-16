import { useMemo, useState } from "react";
import { useCurrentEditor } from "@tiptap/react";
import { useDatabaseContext } from "../../context/database-context";
import type { CalendarView, DatabaseProperty, Page } from "src/types";
import type { DragStorage } from "../../extensions";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./no-date-panel.scss";
import { useDataSource } from "../../hooks/use-data-source";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Input } from "src/components/tiptap-ui-primitive/input";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

function isEmptyDateValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function todayISODate(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export function NoDatePanel() {
  const { db, source, sortedRecords } = useDatabaseContext();
  const { setCellValue } = useDataSource(source?.id);
  const { editor } = useCurrentEditor();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const activeView = db.activeView as CalendarView | undefined;

  // Same date-property resolution as useCalendarLayout.
  const dateProp: DatabaseProperty | undefined = useMemo(() => {
    if (!source || activeView?.type !== "calendar") return undefined;

    if (activeView.datePropertyId) {
      const explicit = source.properties.find(
        (property) =>
          property.id === activeView.datePropertyId &&
          property.config.type === "date",
      );
      if (explicit) return explicit;
    }

    return source.properties.find(
      (property) => property.config.type === "date",
    );
  }, [source, activeView]);

  const titleProp = useMemo(
    () => source?.properties.find((p) => p.config.type === "title"),
    [source],
  );

  const noDateRecords: Page[] = useMemo(() => {
    if (!dateProp) return [];
    return sortedRecords.filter((record) =>
      isEmptyDateValue(record.values?.[dateProp.id]),
    );
  }, [sortedRecords, dateProp]);

  const getTitle = (record: Page) =>
    titleProp
      ? String(record.values?.[titleProp.id] ?? record.title ?? "Untitled")
      : (record.title ?? "Untitled");

  const filteredRecords = useMemo(() => {
    if (!query.trim()) return noDateRecords;
    const q = query.trim().toLowerCase();
    return noDateRecords.filter((record) =>
      getTitle(record).toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noDateRecords, query, titleProp]);

  if (!dateProp) return null;

  const handleOpen = (recordId: string) => {
    setCellValue(recordId, dateProp.id, todayISODate());
  };

  if (db.activeView.type !== "calendar") return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost">
          <span className="tiptap-button-text">
            No date ({noDateRecords.length})
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent
          avoidCollisions
          collisionPadding={8}
          style={{ zIndex: 999 }}
        >
          <Card className="panel-container">
            <Spacer size={4} />
            <CardItemGroup
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <Input
                autoFocus
                type="text"
                placeholder="Search for a page..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="db-no-date-panel__search-input"
              />
            </CardItemGroup>

            <p className="db-no-date-panel__hint">
              Click or drag to calendar to add date.
            </p>

            <CardBody className="db-no-date-panel__list">
              {filteredRecords.length === 0 && (
                <div className="db-no-date-panel__empty">No pages found</div>
              )}

              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="db-no-date-panel__row"
                  data-record-id={record.id}
                  draggable
                  onDragStart={(event) => {
                    if (!editor) return;
                    const storage = editor.storage.boardDrag as DragStorage;
                    storage.draggingId = record.id;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", record.id);
                  }}
                  onDragEnd={() => {
                    if (!editor) return;
                    const storage = editor.storage.boardDrag as DragStorage;
                    storage.draggingId = null;
                  }}
                >
                  <Button variant="ghost">
                    <DynamicIcon
                      name={record.cover.iconName ?? undefined}
                      className="tiptap-button-icon"
                    />
                    <span className="tiptap-button-text">
                      {getTitle(record)}
                    </span>
                  </Button>
                  <Spacer orientation="horizontal" />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen(record.id);
                    }}
                  >
                    <span className="tiptap-button-text"> Open</span>
                  </Button>
                </div>
              ))}
            </CardBody>
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
