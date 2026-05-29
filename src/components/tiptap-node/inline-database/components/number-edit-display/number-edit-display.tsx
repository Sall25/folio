import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type {
  ConfigOf,
  DatabaseProperty,
  NumberFormat,
  DecimalPlaces,
} from "../../types/types";
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

  const [formatOpen, setFormatOpen] = useState(false);
  const [decimalsOpen, setDecimalsOpen] = useState(false);

  return (
    <Card
      style={{ padding: "5px 10px", boxShadow: "var(--tt-shadow-elevated-sm)" }}
    >
      <CardBody>
        <CardItemGroup>
          {/* Number format */}
          <Popover open={formatOpen} onOpenChange={setFormatOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ width: "100%", justifyContent: "flex-start" }}
              >
                <span className="tiptap-button-text">Number format</span>
                <Spacer orientation="horizontal" />
                <span
                  className="tiptap-button-text"
                  style={{ color: "var(--tt-gray-light-500)" }}
                >
                  {FORMAT_LABEL[format]}
                </span>
                <ChevronRight className="tiptap-button-icon-sub" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start">
              <Card
                style={{
                  padding: "5px 10px",
                  boxShadow: "var(--tt-shadow-elevated-sm)",
                  maxHeight: 280,
                  overflowY: "auto",
                  minWidth: 200,
                }}
              >
                <CardItemGroup>
                  {(Object.keys(FORMAT_LABEL) as NumberFormat[]).map((f) => (
                    <Button
                      key={f}
                      variant="ghost"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        fontWeight: f === format ? 600 : 400,
                      }}
                      onClick={() => {
                        onChange({ format: f });
                        setFormatOpen(false);
                      }}
                    >
                      <span className="tiptap-button-text">
                        {FORMAT_LABEL[f]}
                      </span>
                    </Button>
                  ))}
                </CardItemGroup>
              </Card>
            </PopoverContent>
          </Popover>

          {/* Decimal places */}
          <Popover open={decimalsOpen} onOpenChange={setDecimalsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ width: "100%", justifyContent: "flex-start" }}
              >
                <span className="tiptap-button-text">Decimal places</span>
                <Spacer orientation="horizontal" />
                <span
                  className="tiptap-button-text"
                  style={{ color: "var(--tt-gray-light-500)" }}
                >
                  {decimals === "default" ? "Default" : String(decimals)}
                </span>
                <ChevronRight className="tiptap-button-icon-sub" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start">
              <Card
                style={{
                  padding: "5px 10px",
                  boxShadow: "var(--tt-shadow-elevated-sm)",
                  minWidth: 160,
                }}
              >
                <CardItemGroup>
                  {DECIMAL_OPTIONS.map((opt) => (
                    <Button
                      key={String(opt.value)}
                      variant="ghost"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        fontWeight: opt.value === decimals ? 600 : 400,
                      }}
                      onClick={() => {
                        onChange({ decimalPlaces: opt.value });
                        setDecimalsOpen(false);
                      }}
                    >
                      <span className="tiptap-button-text">{opt.label}</span>
                    </Button>
                  ))}
                </CardItemGroup>
              </Card>
            </PopoverContent>
          </Popover>

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
