import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  NumberEditDisplay,
  type NumberEditDisplayProps,
} from "../../ui/number/number-edit-display";
import { PropertyEditPopover } from "../property-edit-popover";

type NumberPropertyProps = NumberEditDisplayProps;

export function NumberProperty(props: NumberPropertyProps) {
  return (
    <Card>
      <PropertyEditPopover>
        <NumberEditDisplay {...props} />
      </PropertyEditPopover>
    </Card>
  );
}
