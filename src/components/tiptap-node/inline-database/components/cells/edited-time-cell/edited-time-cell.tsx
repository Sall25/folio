import { formatRelativeTime } from "src/utils/format-relative";
import type { CellProps } from "../types";
import { useTranslation } from "react-i18next";
import i18n from "src/i18n/config";

export function EditedTimeCell({ value, unwrapped }: CellProps<"edited_time">) {
  const { t } = useTranslation();
  return (
    <div className="db-cell" data-wrap={unwrapped ? "false" : "true"}>
      <span>{formatRelativeTime(value, t, i18n.language)}</span>
    </div>
  );
}
