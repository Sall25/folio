import { ListFilter } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { FilterPanel } from "../filter-panel";
import type { DatabaseProperty, DatabaseView } from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { memo } from "react";

const CONTROL_BUTTON_STYLE: React.CSSProperties = {
  minHeight: 22,
  height: 22,
  borderRadius: "var(--tt-radius-sm)",
  background: "transparent",
};

function FilterControlImpl({
  db,
  activeView,
  properties,
  activeFilterCount,
  showFilterChips,
  onShowFilterChipsChange,
}: {
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  properties: DatabaseProperty[];
  activeFilterCount: number;
  showFilterChips: boolean;
  onShowFilterChipsChange: (show: boolean) => void;
}) {
  // Rules exist → the button toggles the chip bar.
  if (activeFilterCount > 0) {
    return (
      <Button
        size="small"
        variant="ghost"
        tooltip={showFilterChips ? "Hide filters" : "Show filters"}
        data-active-state="on"
        onClick={() => onShowFilterChipsChange(!showFilterChips)}
        style={CONTROL_BUTTON_STYLE}
      >
        <ListFilter className="tiptap-button-icon" size={14} />
      </Button>
    );
  }

  // None yet → open the panel to create the first one.
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          tooltip="Filter"
          size="small"
          data-active-state="off"
          style={CONTROL_BUTTON_STYLE}
        >
          <ListFilter className="tiptap-button-icon" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="db-panel">
        <FilterPanel properties={properties} db={db} activeView={activeView} />
      </PopoverContent>
    </Popover>
  );
}

export const FilterControl = memo(FilterControlImpl);
