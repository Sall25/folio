import type { SelectOption } from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";

interface SelectCellDisplayProps {
  value: SelectOption | null;
  options: SelectOption[];
  onChange?: (option: SelectOption) => void;
  readonly?: boolean;
}

export function SelectCellDisplay({
  value,
  options,
  onChange,
  readonly = false,
}: SelectCellDisplayProps) {
  const displayed = value ?? null;

  const trigger = (
    <Button
      variant="ghost"
      style={{
        background: displayed ? displayed.color : "transparent",
        minHeight: 18,
        height: 20,
        padding: "2px 4px",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: "var(--tt-radius-sm)",
        color: "var(--tt-theme-text)",
        minWidth: !displayed ? 100 : "fit-content",
        // width: "100%",

        // margin: "5px 3px",
      }}
    >
      <span
        className="tiptap-button-text"
        style={{ textAlign: "center", width: "fit-content" }}
      >
        {displayed ? displayed.label : ""}
      </span>
    </Button>
  );

  if (readonly || !onChange) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent sideOffset={-4}>
        <Card
          style={{
            minWidth: 100,
            padding: "5px 10px",
            borderRadius: "var(--tt-radius-sm)",
            boxShadow: "var(--tt-shadow-elevated-sm)",
          }}
        >
          <CardItemGroup
            style={{
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {(options ?? []).map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                style={{
                  background: option.color,
                  minHeight: 18,
                  height: 20,
                  fontFamily:
                    'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif',
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.5,
                }}
                onClick={() => onChange(option)}
              >
                <span className="tiptap-button-text">{option.label}</span>
              </Button>
            ))}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
