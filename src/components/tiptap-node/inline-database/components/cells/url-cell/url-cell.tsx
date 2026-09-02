import { UrlCellDisplay } from "../../../primitives/url-cell-display";
import type { CellProps } from "../types";

export function UrlCell({
  value,
  onChange,
  readonly,
  unwrapped,
  className,
  config,
}: CellProps<"url">) {
  return (
    <div className={className} data-wrap={unwrapped ? "false" : "true"}>
      <UrlCellDisplay
        value={value ?? ""}
        onChange={onChange}
        readonly={readonly}
        showFullUrl={config.showFullUrl}
      />
    </div>
  );
}
