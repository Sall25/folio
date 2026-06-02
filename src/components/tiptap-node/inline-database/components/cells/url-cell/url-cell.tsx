import { UrlCellDisplay } from "../../../primitives/url-cell-display";
import type { CellProps } from "../types";

export function UrlCell({
  value,
  onChange,
  readonly,
  unwrapped,
}: CellProps<"url">) {
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <UrlCellDisplay
        value={value ?? ""}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
}
