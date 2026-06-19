import type { SelectOption } from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Check } from "lucide-react";

interface MultiSelectCellDisplayProps {
  value: SelectOption[];
  options: SelectOption[];
  onChange?: (value: SelectOption[]) => void;
  readonly?: boolean;
}

export function MultiSelectCellDisplay({
  value,
  options,
  onChange,
  readonly = false,
}: MultiSelectCellDisplayProps) {
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
        borderRadius: "var(--tt-radius-sm)",
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.5,
      }}
    >
      {value.length > 0 ? (
        value.map((v) => (
          <Button
            key={v.id}
            variant="ghost"
            style={{
              background: v.color,
              minHeight: 18,
              height: 20,
              borderRadius: "var(--tt-radius-sm)",
            }}
          >
            <span className="tiptap-button-text">{v.label}</span>
          </Button>
        ))
      ) : (
        <span style={{ opacity: 0 }}>_</span>
      )}
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
            {(options ?? []).map((option) => {
              const isSelected = value.some((v) => v.id === option.id);
              return (
                <Button
                  key={option.id}
                  variant="ghost"
                  style={{
                    background: option.color,
                    minHeight: 18,
                    height: 20,
                    outline: isSelected ? "2px solid white" : "none",
                  }}
                  onClick={() => toggleOption(option)}
                >
                  {isSelected && <Check size={10} style={{ marginRight: 3 }} />}
                  <span className="tiptap-button-text">{option.label}</span>
                </Button>
              );
            })}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
