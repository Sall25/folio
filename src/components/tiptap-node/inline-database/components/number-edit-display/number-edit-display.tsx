import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { MenuRow } from "src/components/tiptap-node/inline-database/components/menu-row";
import { NavigableMenuItem } from "src/components/tiptap-node/inline-database/components/navigable-menu-item";
import type {
  ConfigOf,
  DatabaseProperty,
  NumberFormat,
  DecimalPlaces,
} from "src/types";
import "./number-edit-display.scss";

type NumberConfig = ConfigOf<"number">;

const FORMAT_LABEL: Record<NumberFormat, string> = {
  number: "Number",
  number_with_commas: "Number with commas",
  percent: "Percent",
  dollar: "Dollar",
  euro: "Euro",
  pound: "Pound",
  yen: "Yen",
  ruble: "Ruble",
  rupee: "Rupee",
  won: "Won",
  yuan: "Yuan",
};

const DECIMAL_OPTIONS: { value: DecimalPlaces; label: string }[] = [
  { value: "default", label: "Default" },
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

export function NumberEditDisplay({
  prop,
  onChange,
}: {
  prop: DatabaseProperty;
  onChange: (patch: Partial<NumberConfig>) => void;
}) {
  const config = prop.config as NumberConfig;
  const format = config.format ?? "number";
  const decimals = config.decimalPlaces ?? "default";
  const showAs = config.showAs ?? "number";

  return (
    <Card
      style={{
        padding: "5px",
        boxShadow: "var(--tt-shadow-elevated-md)",
        border: "1px solid var(--tt-border-color)",
        minWidth: 360,
      }}
    >
      <CardBody style={{ width: "100%" }}>
        <CardItemGroup>
          {/* Number format */}
          <NavigableMenuItem
            label="Number format"
            sub={FORMAT_LABEL[format]}
            side="left"
          >
            <Card
              style={{
                padding: "5px",
                border: "1px solid var(--tt-border-color)",
                // maxHeight: 280,
                overflowY: "auto",
                scrollbarWidth: "thin",
              }}
            >
              <CardItemGroup>
                {(Object.keys(FORMAT_LABEL) as NumberFormat[]).map((f) => (
                  <MenuRow
                    key={f}
                    label={FORMAT_LABEL[f]}
                    selected={f === format}
                    onClick={() => onChange({ format: f })}
                  />
                ))}
              </CardItemGroup>
            </Card>
          </NavigableMenuItem>

          {/* Decimal places */}
          <NavigableMenuItem
            label="Decimal places"
            sub={decimals === "default" ? "Default" : String(decimals)}
            side="left"
          >
            <Card
              style={{
                padding: "5px",
                border: "1px solid var(--tt-border-color)",
                boxShadow: "var(--tt-shadow-elevated-sm)",
                scrollbarWidth: "thin",
              }}
            >
              <CardItemGroup>
                {DECIMAL_OPTIONS.map((opt) => (
                  <MenuRow
                    key={String(opt.value)}
                    label={opt.label}
                    selected={opt.value === decimals}
                    onClick={() => onChange({ decimalPlaces: opt.value })}
                  />
                ))}
              </CardItemGroup>
            </Card>
          </NavigableMenuItem>

          <Separator orientation="horizontal" />

          <CardGroupLabel>Show as</CardGroupLabel>

          <Grid columns="1fr 1fr 1fr" gap={8}>
            <GridRow>
              <GridCell
                className={`num-showas${showAs === "number" ? " num-showas--active" : ""}`}
                onClick={() => onChange({ showAs: "number" })}
              >
                <span className="num-showas__num">42</span>
                <span className="num-showas__label">Number</span>
              </GridCell>

              <GridCell
                className={`num-showas${showAs === "bar" ? " num-showas--active" : ""}`}
                onClick={() => onChange({ showAs: "bar" })}
              >
                <span className="num-showas__bar" />
                <span className="num-showas__label">Bar</span>
              </GridCell>

              <GridCell
                className={`num-showas${showAs === "ring" ? " num-showas--active" : ""}`}
                onClick={() => onChange({ showAs: "ring" })}
              >
                <span className="num-showas__ring" />
                <span className="num-showas__label">Ring</span>
              </GridCell>
            </GridRow>
          </Grid>

          <span className="num-showas__hint">
            Changes apply to all views showing this property.
          </span>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
