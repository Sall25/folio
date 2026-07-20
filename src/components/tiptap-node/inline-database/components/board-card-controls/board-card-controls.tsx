import { useState } from "react";
import { Ellipsis, Frame } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DatabaseProperty, Page } from "src/types";
import { SelectionActionsMenu } from "../selection-actions-menu";
import "./board-card-controls.scss";

/**
 * Hover chrome on a card's cover: reposition, aspect, and the actions menu.
 *
 * Rendered inside the cover so it can absolutely position against it. Every
 * control stops propagation — the card itself is a drag handle and a click
 * target for opening the page, so without that a click here would drag or
 * navigate instead.
 */
export function BoardCardControls({
  record,
  properties,
  onReposition,
  onAspect,
  onSetValue,
  onDelete,
  onDuplicate,
  onLayout,
  onPropertyVisibility,
  lastEditedBy,
  lastEditedAt,
  repositioning,
}: {
  record: Page;
  properties: DatabaseProperty[];
  onReposition?: () => void;
  onAspect?: () => void;
  onSetValue: (propertyId: string, value: unknown) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onLayout?: () => void;
  onPropertyVisibility?: () => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
  repositioning?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // stopPropagation only. preventDefault on click cancels the activation
  // behavior, which is exactly what these buttons need to keep.
  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="db-card-controls"
      // The card is a dnd-kit draggable; without this a press here starts a drag.
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      data-open={menuOpen || undefined}
    >
      {onReposition && (
        <Button
          variant="ghost"
          className="db-card-controls__btn"
          data-active-state={repositioning ? "on" : undefined}
          onClick={(e) => {
            stop(e);
            onReposition();
          }}
        >
          <span className="tiptap-button-text">
            {repositioning ? "Done" : "Reposition"}
          </span>
        </Button>
      )}

      {onAspect && (
        <Button
          variant="ghost"
          className="db-card-controls__btn"
          tooltip="Cover fit"
          onClick={(e) => {
            stop(e);
            onAspect();
          }}
        >
          <Frame className="tiptap-button-icon" size={14} />
        </Button>
      )}

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="db-card-controls__btn"
            tooltip="Actions"
            // Opening from onClick sidesteps PM entirely — it suppresses the
            // pointerdown Radix's trigger listens for inside a
            // contentEditable=false NodeView. Same fix as CellEditorPopover.
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <Ellipsis className="tiptap-button-icon" size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          // PM handles the same pointerdown Radix's dismiss layer watches, and
          // inside a contentEditable=false NodeView that reads as an "outside"
          // interaction — so the menu opened and closed on the same click.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <SelectionActionsMenu
            recordIds={[record.id]}
            properties={properties}
            onSetValue={onSetValue}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onLayout={onLayout}
            onPropertyVisibility={onPropertyVisibility}
            lastEditedBy={lastEditedBy}
            lastEditedAt={lastEditedAt}
            onClose={() => setMenuOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
