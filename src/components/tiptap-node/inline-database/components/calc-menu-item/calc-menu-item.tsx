import { Sigma } from "lucide-react";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { MenuRow } from "../menu-row";
import { NavigableMenuItem } from "../navigable-menu-item";
import type { DatabaseProperty, CalcType } from "src/types";
import { CALC_LABEL, getCalcGroups } from "../../utils";

export function CalcMenuItem({
  prop,
  calc,
  onChange,
}: {
  prop: DatabaseProperty;
  calc: CalcType;
  onChange: (calc: CalcType) => void;
}) {
  const groups = getCalcGroups(prop);

  return (
    <NavigableMenuItem
      Icon={Sigma}
      label="Calculate"
      sub={calc === "none" ? undefined : CALC_LABEL[calc]}
    >
      <Card style={{ padding: 5, minWidth: 180 }}>
        <CardItemGroup>
          <MenuRow
            label="None"
            selected={calc === "none"}
            onClick={() => onChange("none")}
          />
          {groups.map((group, gi) => (
            <div key={group.label}>
              {gi >= 0 && <Separator orientation="horizontal" />}
              {group.calcs.map((c) => (
                <MenuRow
                  key={c}
                  label={CALC_LABEL[c]}
                  selected={calc === c}
                  onClick={() => onChange(c)}
                />
              ))}
            </div>
          ))}
        </CardItemGroup>
      </Card>
    </NavigableMenuItem>
  );
}
