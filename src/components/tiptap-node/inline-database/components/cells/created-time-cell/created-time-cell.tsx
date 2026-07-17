import { useTranslation } from "react-i18next";
import type { CellProps } from "../types";
import { formatRelativeTime } from "src/utils/format-relative";
import i18n from "src/i18n/config";

export function CreatedTimeCell({
  value,
  unwrapped,
}: CellProps<"created_time">) {
  const { t } = useTranslation();
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      {" "}
      <span>{formatRelativeTime(value, t, i18n.language)}</span>
    </div>
  );
}
