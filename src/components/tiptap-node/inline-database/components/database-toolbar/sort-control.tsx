import { ArrowUpDown } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { SortPanel } from "../sort-panel";
import type { DatabaseProperty, DatabaseView, SortRule } from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { memo } from "react";

const CONTROL_BUTTON_STYLE: React.CSSProperties = {
  minHeight: 22,
  height: 22,
  borderRadius: "var(--tt-radius-sm)",
  background: "transparent",
};

function SortControlImpl({
  db,
  activeView,
  properties,
  sorts,
  activeSortCount,
  showSortChips,
  onShowSortChipsChange,
}: {
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  properties: DatabaseProperty[];
  sorts: SortRule[];
  activeSortCount: number;
  showSortChips: boolean;
  onShowSortChipsChange: (show: boolean) => void;
}) {
  if (activeSortCount > 0) {
    return (
      <Button
        variant="ghost"
        size="small"
        tooltip={showSortChips ? "Hide sorts" : "Show sorts"}
        data-active-state="on"
        onClick={() => onShowSortChipsChange(!showSortChips)}
        style={CONTROL_BUTTON_STYLE}
      >
        <ArrowUpDown className="tiptap-button-icon" size={14} />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          tooltip="Sort"
          variant="ghost"
          size="small"
          data-active-state="off"
          style={CONTROL_BUTTON_STYLE}
        >
          <ArrowUpDown className="tiptap-button-icon" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="db-panel"
        avoidCollisions
        alignOffset={6}
      >
        <SortPanel
          properties={properties}
          db={db}
          activeView={activeView}
          sorts={sorts}
        />
      </PopoverContent>
    </Popover>
  );
}

export const SortControl = memo(SortControlImpl);
