import { Check, ChevronRight, Hash } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { NumberFormat, NumberFormatDropdownProps } from "./types";

const FORMATS = [
  { id: "number", name: "Number", preview: "1,000" },
  { id: "dollar", name: "Dollar", preview: "$1,000" },
  { id: "euro", name: "Euro", preview: "€1,000" },
  { id: "pound", name: "Pound", preview: "£1,000" },
  { id: "percent", name: "Percent", preview: "100%" },
  { id: "decimal", name: "2 decimals", preview: "1,000.00" },
  { id: "compact", name: "Compact", preview: "1K" },
] as const;

const SEPARATORS_BEFORE = new Set<NumberFormat>(["percent", "decimal"]);

export function NumberFormatDropdown({
  format,
  onSelect,
}: NumberFormatDropdownProps) {
  const current = FORMATS.find((f) => f.id === format) ?? FORMATS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" style={{ minWidth: 280 }}>
          <Hash className="tiptap-button-icon" data-size="large" />
          <span className="tiptap-button-text">Format</span>
          <Spacer orientation="horizontal" />
          <span style={{ display: "flex", alignItems: "center" }}>
            <span className="tiptap-button-text" style={{ opacity: 0.8 }}>
              {current.name}
            </span>
            <ChevronRight className="tiptap-button-icon-sub" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent side="right" align="start">
        <Card style={{ minWidth: 200, padding: 4 }}>
          <CardItemGroup
            style={{
              width: "100%",
              justifyContent: "flex-start",
              alignItems: "flex-start",
            }}
          >
            {FORMATS.map((fmt) => (
              <div key={fmt.id} style={{ width: "100%" }}>
                {SEPARATORS_BEFORE.has(fmt.id as NumberFormat) && (
                  <Separator orientation="horizontal" />
                )}
                <Button
                  variant="ghost"
                  onClick={() => onSelect(fmt.id as NumberFormat)}
                  style={{ width: "100%" }}
                >
                  <span
                    className="tiptap-button-text"
                    style={{
                      opacity: 0.5,
                      minWidth: 52,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmt.preview}
                  </span>
                  <span className="tiptap-button-text">{fmt.name}</span>
                  {fmt.id === format && (
                    <>
                      <Spacer orientation="horizontal" />
                      <Check className="tiptap-button-icon" data-size="large" />
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
