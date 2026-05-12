import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  SelectOptionsEditor,
  type SelectOptionsEditorProps,
} from "../../ui/select/select-options-editor/select-options-editor";
import { PropertyEditPopover } from "../property-edit-popover";

export type SelectPropertyProps = SelectOptionsEditorProps & {
  hideWhenUnavailable?: boolean;
};

export function SelectProperty(props: SelectPropertyProps) {
  const { hideWhenUnavailable } = props;

  if (hideWhenUnavailable) return null;

  return (
    <Card>
      <PropertyEditPopover>
        <SelectOptionsEditor {...props} />
      </PropertyEditPopover>
    </Card>
  );
}
