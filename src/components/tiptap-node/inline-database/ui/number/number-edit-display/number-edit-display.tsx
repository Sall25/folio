import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  NumberFormatDropdown,
  type NumberFormatDropdownProps,
} from "../number-format-dropdown";
import { NumberDecimalDropdown } from "../number-decimal-dropdown";
import type { NumberDecimalDropdownProps } from "../number-decimal-dropdown/number-decimal-dropdown";
import {
  NumberDisplayPicker,
  type NumberDisplayPickerProps,
} from "../number-display-picker/number-display-picker";
import { Separator } from "src/components/tiptap-ui-primitive/separator";

export interface NumberEditDisplayProps
  extends
    Omit<NumberFormatDropdownProps, "onSelect">,
    Omit<NumberDecimalDropdownProps, "onSelect">,
    NumberDisplayPickerProps {
  onDecimalSelect: NumberDecimalDropdownProps["onSelect"];
  onNumberSelect: NumberFormatDropdownProps["onSelect"];
}

export function NumberEditDisplay({
  format,
  onNumberSelect,
  decimal,
  onDecimalSelect,
  value,
  onChange,
}: NumberEditDisplayProps) {
  return (
    <Card style={{ padding: "5px", borderRadius: "var(--tt-radius-sm)" }}>
      <CardItemGroup style={{ gap: 5 }}>
        <NumberFormatDropdown format={format} onSelect={onNumberSelect} />
        <NumberDecimalDropdown decimal={decimal} onSelect={onDecimalSelect} />
      </CardItemGroup>
      <Separator orientation="horizontal" />
      <CardItemGroup style={{ width: "100%", justifyContent: "flex-start" }}>
        <CardGroupLabel>Show as:</CardGroupLabel>
        <NumberDisplayPicker value={value} onChange={onChange} />
      </CardItemGroup>
    </Card>
  );
}
