import { FilesCellDisplay } from "../../../primitives/files-cell-display";
import type { CellProps } from "../types";

export function FilesCell({
  value,
  onChange,
  readonly,
  unwrapped,
  className,
}: CellProps<"files">) {
  return (
    <div className={className} data-wrap={unwrapped ? "false" : "true"}>
      <FilesCellDisplay
        value={value ?? []}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
}
