import { useState, useRef, useEffect, useMemo, useDeferredValue } from "react";
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
import { useVirtualizer } from "@tanstack/react-virtual";

interface IconPopoverProps {
  Icon: LucideIcon;
  color: string;
  name: string;
  onSelect: (name: string, color?: string) => void;
}

const COLORS_PER_ROW = 5;
const ICONS_PER_ROW = 8;

const colorRows = Array.from(
  { length: Math.ceil(ICON_COLORS.length / COLORS_PER_ROW) },
  (_, i) => ICON_COLORS.slice(i * COLORS_PER_ROW, (i + 1) * COLORS_PER_ROW),
);

function IconPopover({ Icon, color, name, onSelect }: IconPopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          // style={{ minWidth: 46, width: 46 }}
          tooltip={name}
        >
          <Icon
            className="tiptap-button-icon"
            style={{
              width: 22,
              height: 22,
            }}
            size={22}
            strokeWidth={2}
            stroke={color}
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
                      <Icon
                        className="tiptap-button-icon"
                        size={24}
                        strokeWidth={2}
                        stroke={c.value}
                        style={{
                          width: 22,
                          height: 22,
                        }}
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

type IconColor = string;

export function IconPicker({
  onSelect,
}: {
  onSelect: (n: IconName, color?: IconColor) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const deferred = useDeferredValue(query);
  const isStale = query !== deferred;

  const filtered = useMemo(
    () =>
      ICON_LIST.filter((e) =>
        e.name.toLowerCase().includes(deferred.toLowerCase()),
      ),
    [deferred],
  );

  // Group into rows of 8
  const rows = useMemo(
    () =>
      Array.from(
        { length: Math.ceil(filtered.length / ICONS_PER_ROW) },
        (_, i) => filtered.slice(i * ICONS_PER_ROW, (i + 1) * ICONS_PER_ROW),
      ),
    [filtered],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

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
          border: "1px solid var(--tt-border-color)",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
          background: "var(--tt-theme-bg)",
          color: "var(--tt-text-color)",
        }}
      />
      <Spacer orientation="vertical" />
      <CardGroupLabel>Icons</CardGroupLabel>

      <div
        ref={scrollRef}
        style={{
          minWidth: 350,
          height: 250,
          overflowY: "auto",
          opacity: isStale ? 0.6 : 1,
          transition: "opacity 0.1s",
        }}
      >
        {filtered.length === 0 ? (
          <span
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "var(--tt-text-color)",
              padding: "16px 0",
              display: "block",
            }}
          >
            No icons found
          </span>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: virtualRow.start,
                    left: 0,
                    right: 0,
                    display: "flex",
                    width: "100%",

                    justifyContent: "space-between",
                  }}
                >
                  {row.map(({ name, icon: Icon, color }) => (
                    <IconPopover
                      key={name}
                      Icon={Icon}
                      color={color}
                      name={name}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CardItemGroup>
  );
}
