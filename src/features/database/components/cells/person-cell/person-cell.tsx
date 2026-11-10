import { useTranslation } from "react-i18next";
import type { Page, PersonValue } from "src/types";
import { PersonCellDisplay } from "../../../primitives/person-cell-display";
import { useWorkspacePeople } from "../../../hooks/use-workspace-people";
import { usePersonGroups } from "../../../hooks/use-person-groups";
import { useAssignNotifications } from "../../../hooks/use-assign-notifications";
import type { CellProps } from "../types";

export function PersonCell({
  value,
  config,
  onChange,
  readonly,
  unwrapped,
  className,
  record,
}: CellProps<"person"> & {
  /** The row: people added to it are notified (use-assign-notifications). */
  record?: Page;
}) {
  const { t } = useTranslation();
  const people = useWorkspacePeople();
  const groups = usePersonGroups();
  const notify = useAssignNotifications();

  const change = (next: PersonValue[] | null) => {
    if (record) notify(record, value, next);
    onChange(next);
  };

  return (
    <div
      className={className ?? "db-cell"}
      data-wrap={unwrapped ? "false" : "true"}
    >
      <PersonCellDisplay
        value={value ?? []}
        people={people}
        onChange={change}
        single={config.limit === "single"}
        readonly={readonly}
        groups={groups}
        notifyHint={record ? t("database.assign.notifyHint") : undefined}
      />
    </div>
  );
}
