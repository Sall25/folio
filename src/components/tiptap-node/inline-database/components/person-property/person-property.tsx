import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  PersonEditDisplay,
  type PersonPropertyProps,
} from "../../ui/person/person-edit-display";

export function PersonProperty(props: PersonPropertyProps) {
  return (
    <Card>
      <PersonEditDisplay {...props} />
    </Card>
  );
}
