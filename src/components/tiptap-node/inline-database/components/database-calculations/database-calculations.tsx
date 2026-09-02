import { useState } from "react";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DatabaseProperty, Page, CalcType } from "src/types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import {
  CALC_LABEL,
  getCalcGroups,
  getCellValue,
  runCalc,
} from "../../utils/calc-utils";
import "./database-calculations.scss";
import { useDatabaseContext } from "../../nodes/database-context";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

interface CalcCellProps {
  prop: DatabaseProperty;
  records: Page[];
  calc: CalcType;
  onChange: (calc: CalcType) => void;
}

function CalcCell({ prop, records, calc, onChange }: CalcCellProps) {
  const [open, setOpen] = useState(false);
  const groups = getCalcGroups(prop);

  if (!groups) {
    return <div className="db-calc-cell db-calc-cell--empty" />;
  }

  const values = records.map((r) => getCellValue(r, prop.id));
  const result = runCalc(calc, values);
  const iconName = PROPERTY_TYPE_ICONS[prop.config.type];

  // The button is identical open or closed; only the Popover wrapper differs.
  const button = (
    <button
      className={`db-calc-cell ${calc !== "none" ? "db-calc-cell--active" : ""}`}
      onClick={() => setOpen(true)}
    >
      {calc === "none" ? (
        <span className="db-calc-cell__placeholder">Calculate</span>
      ) : (
        <span className="db-calc-cell__result">
          <span className="db-calc-cell__label">{CALC_LABEL[calc]}</span>
          <span className="db-calc-cell__value">{result}</span>
        </span>
      )}
    </button>
  );

  // Closed → bare button, NO Radix Popover mounted. The popover (and its
  // dismiss-layer listeners + portal) exists only for the one cell being
  // picked, not all N result cells.
  if (!open) return button;

  return (
    <Popover open onOpenChange={setOpen} defaultOpen>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent side="top" align="start" className="db-panel">
        <Card style={{ padding: "5px 10px", minWidth: 200 }}>
          <div className="db-calc-popover-header">
            <DynamicIcon
              name={iconName}
              size={12}
              className="db-calc-popover-header__icon"
            />
            <span className="db-calc-popover-header__name">{prop.name}</span>
          </div>
          <CardItemGroup>
            <Button
              variant="ghost"
              style={{
                justifyContent: "flex-start",
                width: "100%",
                fontWeight: calc === "none" ? 600 : 400,
              }}
              onClick={() => {
                onChange("none");
                setOpen(false);
              }}
            >
              <span className="tiptap-button-text">None</span>
            </Button>
            {groups.map((group) => (
              <div key={group.label}>
                <div className="db-calc-group-label">{group.label}</div>
                {group.calcs.map((c) => (
                  <Button
                    key={c}
                    variant="ghost"
                    data-active-state={calc === c ? "on" : "off"}
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => {
                      onChange(c);
                      setOpen(false);
                    }}
                  >
                    <span className="tiptap-button-text">{CALC_LABEL[c]}</span>
                  </Button>
                ))}
              </div>
            ))}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// ── Main calculations row ──────────────────────────────────────────────────
// Selected calcs now persist per-VIEW (view.calculations), so the row and the
// header CalcMenuItem stay in sync and survive reloads. No local state.
export function DatabaseCalculations({
  properties,
  records,
  gridTemplateColumns,
}: {
  properties: DatabaseProperty[];
  records: Page[];
  gridTemplateColumns: string;
}) {
  const { db } = useDatabaseContext();
  const view = db.activeView;
  const calcs = (view?.calculations ?? {}) as Record<string, CalcType>;

  const setCalc = (propId: string, calc: CalcType) => {
    if (!view) return;
    db.updateView(view.id, {
      calculations: { ...calcs, [propId]: calc },
    });
  };

  return (
    <div className="db-calculations" style={{ gridTemplateColumns }}>
      {properties.map((prop) => (
        <CalcCell
          key={prop.id}
          prop={prop}
          records={records}
          calc={calcs[prop.id] ?? "none"}
          onChange={(c) => setCalc(prop.id, c)}
        />
      ))}
      <div className="db-calc-cell db-calc-cell--empty" />
    </div>
  );
}
