import { useState, useRef, useEffect, useMemo } from "react";
import { ICON_COLORS, ICON_LIST, type IconName } from "./data/icon-list.js";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer/spacer.js";
import type { LucideIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover/popover.js";

interface IconPopoverProps {
  Icon: LucideIcon;
  color: string;
  name: string;
  onSelect: (name: string, color?: string) => void;
}

const COLORS_PER_ROW = 5;

const colorRows = Array.from(
  { length: Math.ceil(ICON_COLORS.length / COLORS_PER_ROW) },
  (_, i) => ICON_COLORS.slice(i * COLORS_PER_ROW, (i + 1) * COLORS_PER_ROW),
);

const ICONS_PER_ROW = 8;

function IconPopover({ Icon, color, name, onSelect }: IconPopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" tooltip={name}>
          <Icon
            className="tiptap-button-icon"
            size={24}
            strokeWidth={1.75}
            stroke={color}
          />
        </Button>
      </PopoverTrigger>
      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent style={{ position: "fixed", zIndex: 9999 }}>
          <Card
            style={{
              minWidth: 200,
              padding: "5px 10px",
              background: "green",
            }}
          >
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
                      <Icon
                        className="tiptap-button-icon"
                        size={24}
                        strokeWidth={1.75}
                        stroke={c.value}
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

// ─── Picker Popover ───────────────────────────────────────────────────────────
type IconColor = string;

export function IconPicker({
  onSelect,
}: {
  onSelect: (n: IconName, color?: IconColor) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      ICON_LIST.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 60),
    [query],
  );

  const iconRows = useMemo(
    () =>
      Array.from(
        { length: Math.ceil(filtered.length / ICONS_PER_ROW) },
        (_, i) => filtered.slice(i * ICONS_PER_ROW, (i + 1) * ICONS_PER_ROW),
      ),
    [filtered],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <CardItemGroup orientation="vertical">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search icons…"
        style={{
          width: "100%",
          padding: "6px 10px",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
          color: "#111827",
        }}
      />
      <Spacer orientation="vertical" />
      <CardGroupLabel>Icons</CardGroupLabel>

      <ButtonGroup
        orientation="vertical"
        style={{
          minWidth: 300,
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        {filtered.length === 0 ? (
          <span
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#9ca3af",
              padding: "16px 0",
            }}
          >
            No icons found
          </span>
        ) : (
          iconRows.map((row, rowIndex) => (
            <ButtonGroup key={rowIndex} orientation="horizontal">
              {row.map(({ name, icon: Icon, color }, index) => (
                <IconPopover
                  key={index}
                  Icon={Icon}
                  color={color}
                  name={name}
                  onSelect={onSelect}
                />
              ))}
            </ButtonGroup>
          ))
        )}
      </ButtonGroup>
    </CardItemGroup>
  );
}
