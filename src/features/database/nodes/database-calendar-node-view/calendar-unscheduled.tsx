import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { Page } from "src/types";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import type { DragStorage } from "../../extensions/board-drag";
import { useDatabaseContext } from "../../context/database-context";

/**
 * The records a calendar has nowhere to put, listed beside it so they can
 * be dragged onto a day.
 *
 * A record with no date is invisible on a calendar and on a timeline alike
 * — it simply is not anywhere — so this list is the one place it can be
 * given one without hunting it down in a table. Dragging is the calendar's
 * own: the same storage a bar sets when it is picked up, so the drop lands
 * in the same handler and writes the same date (board-drag.ts).
 */
function CalendarUnscheduledImpl({
  records,
  onOpenRecord,
}: {
  records: Page[];
  onOpenRecord?: (recordId: string) => void;
}) {
  const { t } = useTranslation();
  const { editor } = useDatabaseContext();

  if (records.length === 0) return null;

  return (
    <aside className="db-cal-unscheduled">
      <div className="db-cal-unscheduled__head">
        {t("database.manageInCalendar.unscheduled", {
          count: records.length,
        })}
      </div>
      <div className="db-cal-unscheduled__list">
        {records.map((record) => (
          <div
            key={record.id}
            className="db-cal-unscheduled__item"
            data-record-id={record.id}
            draggable
            onClick={() => onOpenRecord?.(record.id)}
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
            <span className="db-cal-unscheduled__icon">
              <DynamicIcon
                name={record.cover?.iconName ?? undefined}
                size={13}
              />
            </span>
            <span className="db-cal-unscheduled__title">
              {record.title || t("database.relation.untitled")}
            </span>
          </div>
        ))}
      </div>
      <p className="db-cal-unscheduled__note">
        {t("database.manageInCalendar.unscheduledNote")}
      </p>
    </aside>
  );
}

export const CalendarUnscheduled = memo(CalendarUnscheduledImpl);
