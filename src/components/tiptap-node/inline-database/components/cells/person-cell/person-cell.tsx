import { PersonCellDisplay } from "../../../primitives/person-cell-display";
import { useWorkspacePeople } from "../../../hooks/use-workspace-people";
import type { CellProps } from "../types";

export function PersonCell({
  value,
  config,
  onChange,
  readonly,
}: CellProps<"person">) {
  const people = useWorkspacePeople();

  return (
    <PersonCellDisplay
      value={value ?? []}
      people={people}
      onChange={onChange}
      single={config.limit === "single"}
      readonly={readonly}
    />
  );
}
