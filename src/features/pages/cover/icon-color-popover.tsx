import { useState } from "react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover/popover.js";
import { splitIconName } from "src/components/icons/icon-style";
import { DynamicIcon } from "./dynamic-icon";
import { ICON_COLORS } from "./data/icon-list.js";

// An icon button that opens the colour choices for that icon: used by the
// icon picker's grid and by its Recent row, so a recent icon can be picked
// again in another colour without searching for it.

/** "calendar_today;fill:0" → "calendar today" (the button's tooltip). */
const iconLabel = (name: string) =>
  splitIconName(name).glyph.replace(/_/g, " ");

interface IconColorPopoverProps {
  name: string;
  color: string;
  onSelect: (name: string, color?: string) => void;
  /** Extra class for the trigger button (e.g. the Recent row's item). */
  className?: string;
}

const COLORS_PER_ROW = 5;

const colorRows = Array.from(
  { length: Math.ceil(ICON_COLORS.length / COLORS_PER_ROW) },
  (_, i) => ICON_COLORS.slice(i * COLORS_PER_ROW, (i + 1) * COLORS_PER_ROW),
);

export function IconColorPopover({
  name,
  color,
  onSelect,
  className,
}: IconColorPopoverProps) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button
        variant="ghost"
        className={className}
        tooltip={iconLabel(name)}
        onClick={() => setOpen(true)}
      >
        <DynamicIcon
          className="tiptap-button-icon"
          name={name}
          style={{ color, width: 20, height: 20 }}
        />
      </Button>
    );
  return (
    <Popover open onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={className} tooltip={iconLabel(name)}>
          <DynamicIcon
            className="tiptap-button-icon"
            name={name}
            style={{ color, width: 20, height: 20 }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent style={{ position: "fixed", zIndex: 9999 }}>
          <Card style={{ minWidth: 200, padding: "5px 10px" }}>
            <CardItemGroup orientation="vertical">
              {colorRows.map((row, rowIndex) => (
                <ButtonGroup
                  key={rowIndex}
                  style={{ gap: "5px" }}
                  orientation="horizontal"
                >
                  {row.map((c, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      onClick={() => {
                        setOpen(false);
                        onSelect(name, c.value);
                      }}
                    >
                      <DynamicIcon
                        className="tiptap-button-icon"
                        name={name}
                        size={36}
                        style={{ color: c.value }}
                      />
                    </Button>
                  ))}
                </ButtonGroup>
              ))}
            </CardItemGroup>
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
