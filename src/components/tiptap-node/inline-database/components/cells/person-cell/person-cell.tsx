import { PersonCellDisplay } from "../../../primitives/person-cell-display";
import { useWorkspacePeople } from "../../../hooks/use-workspace-people";
import type { CellProps } from "../types";

export function PersonCell({
  value,
  config,
  onChange,
  readonly,
  unwrapped,
}: CellProps<"person">) {
  const people = useWorkspacePeople();

  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <PersonCellDisplay
        value={value ?? []}
        people={people}
        onChange={onChange}
        single={config.limit === "single"}
        readonly={readonly}
      />
    </div>
  );
}
