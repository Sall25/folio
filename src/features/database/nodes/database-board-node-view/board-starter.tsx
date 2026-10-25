import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_CONFIGS,
  type BoardView,
  type DatabaseProperty,
} from "src/types";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { ViewPlaceholder } from "../../components/data-source-picker/view-placeholder";
import { getColumnDefs } from "./utils/get-column-defs";
import "../../components/data-source-picker/data-source-picker.scss";

// A board with no columns to show draws the same faded board as a new
// database block (ViewPlaceholder): three status columns. Clicking it makes
// that board real:
//   • it groups by something that has groups (a status, a select with
//     options), just with no cards yet → show its empty groups;
//   • it has nothing to group by (no property, or a select with no options)
//     → add a Status property (Not started / In progress / Done) and group
//     by it.
export function BoardStarter() {
  const { t } = useTranslation();
  const { db, attrs, source } = useDatabaseContext();
  const { updatePropertiesAsync } = useDataSource(source?.id ?? null);
  const [busy, setBusy] = useState(false);

  const view = db.activeView as BoardView | undefined;
  const groupProp = source?.properties.find(
    (p) => p.id === view?.groupByPropertyId,
  );
  const locked = !!attrs.locked;

  const start = async () => {
    if (busy || locked || !view || !source) return;
    setBusy(true);
    try {
      if (groupProp && getColumnDefs(groupProp).length > 0) {
        db.updateView(view.id, { showEmptyGroups: true } as Partial<BoardView>);
        return;
      }
      const status: DatabaseProperty = {
        id: crypto.randomUUID(),
        name: "Status",
        config: structuredClone(DEFAULT_CONFIGS.status),
        width: 160,
      };
      await updatePropertiesAsync([...source.properties, status]);
      db.updateView(view.id, {
        groupByPropertyId: status.id,
        showEmptyGroups: true,
      } as Partial<BoardView>);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="db-setup db-board-starter">
      <div
        className="db-setup__preview"
        role={locked ? undefined : "button"}
        tabIndex={locked ? undefined : 0}
        aria-label={t("database.picker.newPage")}
        aria-disabled={busy || locked || undefined}
        onClick={() => void start()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void start();
          }
        }}
      >
        <ViewPlaceholder type="board" />
      </div>
    </div>
  );
}
