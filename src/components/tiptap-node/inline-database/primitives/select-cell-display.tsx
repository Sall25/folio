import type { SelectOption } from "../types/types";
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
  const displayed = value ?? options[0] ?? null;
  if (!displayed) return null;

  const trigger = (
    <div className="db-cell">
      <Button
        variant="ghost"
        style={{
          background: displayed.color,
          minHeight: 18,
          height: 20,
          padding: "2px 4px",
          width: "fit-content",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: "var(--tt-radius-sm)",
          color: "var(--tt-theme-text)",
          // margin: "5px 3px",
        }}
      >
        <span className="tiptap-button-text">{displayed.label}</span>
      </Button>
    </div>
  );

  if (readonly || !onChange) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>
        <Card style={{ minWidth: 100, padding: "10px 15px" }}>
          <CardItemGroup
            style={{
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            {options.map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                style={{ background: option.color, minHeight: 18, height: 20 }}
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
