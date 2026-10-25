import { useState } from "react";
import type { SelectOption } from "src/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Check } from "src/components/icons";
import { pillClass } from "../utils/pill-colors";
import "./select-cell-display.scss";

interface MultiSelectCellDisplayProps {
  value: SelectOption[];
  options: SelectOption[];
  onChange?: (value: SelectOption[]) => void;
  readonly?: boolean;
}

/**
 * Same pills as the select cell (pillClass → .select-badge--<color>), so an
 * option looks the same in both. A picked option is drawn from the property's
 * CURRENT options when it still exists there, so renaming or recolouring an
 * option shows up in every cell; the stored copy is the fallback.
 */
export function MultiSelectCellDisplay({
  value,
  options,
  onChange,
  readonly = false,
}: MultiSelectCellDisplayProps) {
  const [open, setOpen] = useState(false);

  const shown = value.map((v) => options.find((o) => o.id === v.id) ?? v);

  function toggleOption(option: SelectOption) {
    if (!onChange) return;
    const isSelected = value.some((v) => v.id === option.id);
    onChange(
      isSelected ? value.filter((v) => v.id !== option.id) : [...value, option],
    );
  }

  const trigger = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flex: 1,
        cursor: readonly ? "default" : "pointer",
        minHeight: 34,
        flexWrap: "nowrap",
        overflow: "hidden",
        fontSize: 14,
      }}
    >
      {shown.length > 0 ? (
        shown.map((v) => (
          <span key={v.id} className={pillClass("select-badge", v.color)}>
            <span className="select-badge__label">{v.label}</span>
          </span>
        ))
      ) : (
        <span style={{ opacity: 0 }}>_</span>
      )}
    </div>
  );

  if (readonly || !onChange) return trigger;

  // Closed → plain trigger, no Radix Popover (leak/overhead source).
  if (!open) {
    return (
      <div
        role="button"
        tabIndex={0}
        style={{ display: "contents" }}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger}
      </div>
    );
  }

  return (
    <Popover open onOpenChange={setOpen} defaultOpen>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="select-dropdown">
        <Card
          style={{
            minWidth: 180,
            padding: "6px",
            borderRadius: "var(--tt-radius-lg)",
            boxShadow: "var(--tt-shadow-elevated-md)",
          }}
        >
          <CardItemGroup
            orientation="vertical"
            style={{ width: "100%", gap: 2, alignItems: "stretch" }}
          >
            {options.length === 0 && (
              <span className="select-dropdown__empty">
                No options yet — add some in the property's settings.
              </span>
            )}
            {options.map((option) => {
              const isSelected = value.some((v) => v.id === option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className="select-dropdown__option"
                  aria-pressed={isSelected}
                  onClick={() => toggleOption(option)}
                >
                  <span className={pillClass("select-badge", option.color)}>
                    <span className="select-badge__label">{option.label}</span>
                  </span>
                  {isSelected && (
                    <Check
                      size={14}
                      aria-hidden
                      style={{ marginLeft: "auto", flex: "none" }}
                    />
                  )}
                </button>
              );
            })}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
