import { UrlCellDisplay } from "../../../primitives/url-cell-display";
import type { CellProps } from "../types";

export function UrlCell({ value, onChange, readonly }: CellProps<"url">) {
  return (
    <div className="db-cell">
      <UrlCellDisplay
        value={value ?? ""}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
}
