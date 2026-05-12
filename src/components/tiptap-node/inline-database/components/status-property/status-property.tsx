import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  StatusEditDisplay,
  type StatusPropertyProps,
} from "../../ui/status/status-edit-display";
import { PropertyEditPopover } from "../property-edit-popover";

export function StatusProperty(props: StatusPropertyProps) {
  return (
    <Card>
      <PropertyEditPopover>
        <StatusEditDisplay {...props} />
      </PropertyEditPopover>
    </Card>
  );
}
