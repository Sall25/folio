import { useState, useRef, useEffect, useMemo, useDeferredValue } from "react";
import { ICON_COLORS, getIconList, type IconName } from "./data/icon-list.js";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer/spacer.js";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover/popover.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RecentIconRow } from "src/features/shell/sidebar/recent-icon-row/recent-icon-row.js";
import { useIconRecents } from "src/features/pages/cover/use-icon-recents.js";
import { Input } from "src/components/tiptap-ui-primitive/input/input.js";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "src/hooks/use-local-storage";
import {
  joinIconName,
  splitIconName,
  type IconOverride,
} from "src/components/icons/icon-style";
import { IconStyleBar } from "./icon-style-bar";

// The look last chosen in the picker, kept for the next pick.
const PICKER_STYLE_KEY = "folio-icon-picker-style";

/** "calendar_today;fill:0" → "calendar today" (the button's tooltip). */
const iconLabel = (name: string) =>
  splitIconName(name).glyph.replace(/_/g, " ");

interface IconPopoverProps {
  name: string;
  color: string;
  onSelect: (name: string, color?: string) => void;
}

const COLORS_PER_ROW = 5;
const ICONS_PER_ROW = 9;

const colorRows = Array.from(
  { length: Math.ceil(ICON_COLORS.length / COLORS_PER_ROW) },
  (_, i) => ICON_COLORS.slice(i * COLORS_PER_ROW, (i + 1) * COLORS_PER_ROW),
);

function IconPopover({ name, color, onSelect }: IconPopoverProps) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button
        variant="ghost"
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
        <Button variant="ghost" tooltip={iconLabel(name)}>
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

  const { t } = useTranslation();
  const { recents } = useIconRecents();
  // Style, weight and fill for the icon about to be picked. Each grid icon
  // shows it, and the picked name carries it ("description;fill:0").
  const [look, setLook] = useLocalStorage<IconOverride>(PICKER_STYLE_KEY, {});

  const filtered = useMemo(
    () =>
      getIconList().filter((e) =>
        e.name.includes(
          deferred.trim().toLowerCase().replace(/[\s-]+/g, "_"),
        ),
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
    <CardItemGroup orientation="vertical" style={{ width: "100%" }}>
      <Spacer orientation="vertical" size={8} />
      <CardItemGroup orientation="horizontal">
        <Spacer orientation="horizontal" size={5} />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("iconStyle.search")}
        />
        <Spacer orientation="horizontal" size={5} />
      </CardItemGroup>
      <Spacer orientation="vertical" size={6} />
      <IconStyleBar value={look} onChange={setLook} />
      <Spacer orientation="vertical" />
      <CardBody
        ref={scrollRef}
        style={{
          height: 290,
          overflowY: "auto",
          opacity: isStale ? 0.6 : 1,
          transition: "opacity 0.1s",
        }}
      >
        <RecentIconRow target="Icons" recents={recents} onSelect={onSelect} />
        <Spacer orientation="vertical" size={5} />
        <CardGroupLabel>{t("iconStyle.icons")}</CardGroupLabel>
        <Spacer orientation="vertical" size={2} />

        <div>
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
              {t("iconStyle.noResults")}
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
                    {row.map(({ name, color }) => (
                      <IconPopover
                        key={name}
                        name={joinIconName(name, look)}
                        color={color}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardBody>
    </CardItemGroup>
  );
}
