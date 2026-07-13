import type { SelectOption } from "src/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { pillClass } from "../utils/pill-colors";
import "./select-cell-display.scss";

interface SelectCellDisplayProps {
  value: SelectOption | null;
  options: SelectOption[];
  onChange?: (option: SelectOption) => void;
  readonly?: boolean;
}

/**
 * The pill's colour is a CLASS, not an inline background. option.color holds a
 * colour NAME ("blue"), and the class derives both the tint and the label colour
 * from --tt-color-text-blue — so it stays legible in dark mode, which an inline
 * highlight-token background did not. normalizeColor() accepts the legacy var
 * strings too, so existing options render correctly without a data migration.
 */
export function SelectCellDisplay({
  value,
  options,
  onChange,
  readonly = false,
}: SelectCellDisplayProps) {
  const displayed = value ?? null;

  const trigger = displayed ? (
    <button
      type="button"
      className={pillClass("select-badge", displayed.color)}
      contentEditable={false}
    >
      <span className="select-badge__label">{displayed.label}</span>
    </button>
  ) : (
    <button
      type="button"
      className="select-badge select-badge--empty"
      contentEditable={false}
    >
      <span className="select-badge__label">Empty</span>
    </button>
  );

  if (readonly || !onChange) return trigger;

  return (
    <Popover>
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
            {(options ?? []).length === 0 && (
              <span className="select-dropdown__empty">
                No options yet — add some in the property's settings.
              </span>
            )}
            {(options ?? []).map((option) => (
              <button
                key={option.id}
                type="button"
                className="select-dropdown__option"
                onClick={() => onChange(option)}
              >
                <span className={pillClass("select-badge", option.color)}>
                  <span className="select-badge__label">{option.label}</span>
                </span>
              </button>
            ))}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
