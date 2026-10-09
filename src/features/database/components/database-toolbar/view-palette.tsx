import {
  Calendar,
  ChartGantt,
  Columns3,
  LayoutGrid,
  List,
  Table,
} from "lucide-react";
import type { DatabaseView } from "src/types";
import "./view-palette.scss";

const VIEW_ICONS = {
  table: Table,
  list: List,
  board: Columns3,
  gallery: LayoutGrid,
  calendar: Calendar,
  timeline: ChartGantt,
} as const;

import { useTranslation } from "react-i18next";

function ViewPalette({
  type,
  active,
  onSelect,
}: {
  type: DatabaseView["type"];
  active?: boolean;
  onSelect: (type: DatabaseView["type"]) => void;
}) {
  const { t } = useTranslation();
  const label = t(`database.views.${type}`);
  const Icon = VIEW_ICONS[type] ?? ChartGantt;

  return (
    <button
      type="button"
      className="view-palette"
      data-active={active || undefined}
      aria-pressed={active}
      aria-label={`${label} view`}
      onClick={() => onSelect(type)}
    >
      <span className="view-palette__icon">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="view-palette__label">{label}</span>
    </button>
  );
}

export { ViewPalette };
