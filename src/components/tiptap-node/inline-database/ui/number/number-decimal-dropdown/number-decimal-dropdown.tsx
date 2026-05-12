import { Check, ChevronRight, Proportions } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

const DECIMALS = [
  { id: 0, name: "None", preview: "1,000" },
  { id: 1, name: "1 place", preview: "1,000.0" },
  { id: 2, name: "2 places", preview: "1,000.00" },
  { id: 3, name: "3 places", preview: "1,000.000" },
  { id: 4, name: "4 places", preview: "1,000.0000" },
] as const;

export type NumberDecimal = (typeof DECIMALS)[number]["id"];

export interface NumberDecimalDropdownProps {
  decimal: NumberDecimal;
  onSelect: (decimal: NumberDecimal) => void;
}

export function NumberDecimalDropdown({
  decimal,
  onSelect,
}: NumberDecimalDropdownProps) {
  const current = DECIMALS.find((d) => d.id === decimal) ?? DECIMALS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" style={{ minWidth: 210 }}>
          <Proportions className="tiptap-button-icon" data-size="large" />
          <span className="tiptap-button-text">Decimal places</span>
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
            {DECIMALS.map((d) => (
              <Button
                key={d.id}
                variant="ghost"
                onClick={() => onSelect(d.id as NumberDecimal)}
                style={{ width: "100%" }}
              >
                <span
                  className="tiptap-button-text"
                  style={{
                    opacity: 0.5,
                    minWidth: 72,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {d.preview}
                </span>
                <span className="tiptap-button-text">{d.name}</span>
                {d.id === decimal && (
                  <>
                    <Spacer orientation="horizontal" />
                    <Check className="tiptap-button-icon" data-size="large" />
                  </>
                )}
              </Button>
            ))}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
