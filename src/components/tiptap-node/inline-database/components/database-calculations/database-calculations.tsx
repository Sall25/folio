import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseAttrs, DatabaseProperty } from "../../types/types";
import { PROPERTY_TYPE_ICONS } from "../../types/property-type-meta";
import type { Node } from "@tiptap/pm/model";
import "./database-calculations.scss";

// ── Calculation types ──────────────────────────────────────────────────────

type CalcType =
  | "none"
  | "count_all"
  | "count_values"
  | "count_unique"
  | "count_empty"
  | "count_not_empty"
  | "percent_empty"
  | "percent_not_empty"
  | "earliest_date"
  | "latest_date"
  | "date_range"
  | "sum"
  | "average"
  | "median"
  | "min"
  | "max"
  | "range";

const CALC_LABEL: Record<CalcType, string> = {
  none: "Calculate",
  count_all: "Count all",
  count_values: "Count values",
  count_unique: "Count unique",
  count_empty: "Count empty",
  count_not_empty: "Count not empty",
  percent_empty: "Percent empty",
  percent_not_empty: "Percent not empty",
  earliest_date: "Earliest date",
  latest_date: "Latest date",
  date_range: "Date range",
  sum: "Sum",
  average: "Average",
  median: "Median",
  min: "Min",
  max: "Max",
  range: "Range",
};

const BASE_CALCS: CalcType[] = [
  "count_all",
  "count_values",
  "count_unique",
  "count_empty",
  "count_not_empty",
  "percent_empty",
  "percent_not_empty",
];

const DATE_CALCS: CalcType[] = ["earliest_date", "latest_date", "date_range"];
const NUMBER_CALCS: CalcType[] = [
  "sum",
  "average",
  "median",
  "min",
  "max",
  "range",
];

type CalcGroup = { label: string; calcs: CalcType[] };

function getCalcGroups(prop: DatabaseProperty): CalcGroup[] | null {
  const type = prop.config.type;
  if (
    type === "title" ||
    type === "text" ||
    type === "url" ||
    type === "email" ||
    type === "phone" ||
    type === "formula" ||
    type === "relation" ||
    type === "rollup" ||
    type === "person" ||
    type === "created_by" ||
    type === "edited_by"
  )
    return null;
  const groups: CalcGroup[] = [{ label: "Count", calcs: BASE_CALCS }];
  if (type === "number") groups.push({ label: "Number", calcs: NUMBER_CALCS });
  if (type === "date" || type === "created_time" || type === "edited_time")
    groups.push({ label: "Date", calcs: DATE_CALCS });
  return groups;
}

// ── Calculation logic ──────────────────────────────────────────────────────

function getCellValue(record: Node, propertyId: string): unknown {
  let value: unknown = null;
  record.forEach((cell) => {
    if (cell.attrs.propertyId !== propertyId) return;
    value =
      cell.attrs.value ??
      (cell.type.name === "textCell" ? cell.textContent : null);
  });
  return value;
}

function runCalc(calc: CalcType, values: unknown[]): string {
  if (calc === "none") return "";
  const total = values.length;
  const nonEmpty = values.filter((v) => v != null && v !== "" && v !== false);
  const empty = total - nonEmpty.length;

  switch (calc) {
    case "count_all":
      return String(total);
    case "count_values":
      return String(nonEmpty.length);
    case "count_unique":
      return String(new Set(nonEmpty.map(String)).size);
    case "count_empty":
      return String(empty);
    case "count_not_empty":
      return String(nonEmpty.length);
    case "percent_empty":
      return total === 0 ? "0%" : `${Math.round((empty / total) * 100)}%`;
    case "percent_not_empty":
      return total === 0
        ? "0%"
        : `${Math.round((nonEmpty.length / total) * 100)}%`;
    case "earliest_date": {
      const dates = nonEmpty
        .map((v) => new Date(String(v)))
        .filter((d) => !isNaN(d.getTime()));
      if (!dates.length) return "";
      return new Date(
        Math.min(...dates.map((d) => d.getTime())),
      ).toLocaleDateString();
    }
    case "latest_date": {
      const dates = nonEmpty
        .map((v) => new Date(String(v)))
        .filter((d) => !isNaN(d.getTime()));
      if (!dates.length) return "";
      return new Date(
        Math.max(...dates.map((d) => d.getTime())),
      ).toLocaleDateString();
    }
    case "date_range": {
      const dates = nonEmpty
        .map((v) => new Date(String(v)))
        .filter((d) => !isNaN(d.getTime()));
      if (dates.length < 2) return "";
      const min = Math.min(...dates.map((d) => d.getTime()));
      const max = Math.max(...dates.map((d) => d.getTime()));
      const days = Math.round((max - min) / 86400000);
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    case "sum": {
      const nums = nonEmpty.map(Number).filter((n) => !isNaN(n));
      return String(nums.reduce((a, b) => a + b, 0));
    }
    case "average": {
      const nums = nonEmpty.map(Number).filter((n) => !isNaN(n));
      if (!nums.length) return "";
      return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
    }
    case "median": {
      const nums = nonEmpty
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
      if (!nums.length) return "";
      const mid = Math.floor(nums.length / 2);
      return String(
        nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2,
      );
    }
    case "min": {
      const nums = nonEmpty.map(Number).filter((n) => !isNaN(n));
      return nums.length ? String(Math.min(...nums)) : "";
    }
    case "max": {
      const nums = nonEmpty.map(Number).filter((n) => !isNaN(n));
      return nums.length ? String(Math.max(...nums)) : "";
    }
    case "range": {
      const nums = nonEmpty.map(Number).filter((n) => !isNaN(n));
      return nums.length ? String(Math.max(...nums) - Math.min(...nums)) : "";
    }
    default:
      return "";
  }
}

// ── useCalcAvailable hook ──────────────────────────────────────────────────

function useCalcAvailable(
  prop: DatabaseProperty,
  hideWhenUnavailable = true,
): boolean {
  // Available when the property type supports at least one calculation group
  return hideWhenUnavailable ? getCalcGroups(prop) !== null : true;
}

// ── Per-column calc cell ───────────────────────────────────────────────────

interface CalcCellProps {
  prop: DatabaseProperty;
  records: Node[];
  calc: CalcType;
  onChange: (calc: CalcType) => void;
  hideWhenUnavailable?: boolean;
}

function CalcCell({
  prop,
  records,
  calc,
  onChange,
  hideWhenUnavailable = true,
}: CalcCellProps) {
  const isAvailable = useCalcAvailable(prop, hideWhenUnavailable);
  const groups = getCalcGroups(prop);

  if (!isAvailable || !groups) {
    return <div className="db-calc-cell db-calc-cell--empty" />;
  }

  const values = records.map((r) => getCellValue(r, prop.id));
  const result = runCalc(calc, values);
  const Icon = PROPERTY_TYPE_ICONS[prop.config.type];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`db-calc-cell ${calc !== "none" ? "db-calc-cell--active" : ""}`}
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
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="db-panel">
        <Card style={{ padding: "5px 10px", minWidth: 200 }}>
          {/* Header showing property context */}
          <div className="db-calc-popover-header">
            <Icon size={12} className="db-calc-popover-header__icon" />
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
              onClick={() => onChange("none")}
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
                    onClick={() => onChange(c)}
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

export function DatabaseCalculations({
  // attrs,
  records,
  visibleProperties,
  gridTemplateColumns,
}: {
  attrs: DatabaseAttrs;
  records: Node[];
  visibleProperties: DatabaseProperty[];
  gridTemplateColumns: string;
}) {
  const [calcs, setCalcs] = useState<Record<string, CalcType>>({});

  function setCalc(propId: string, calc: CalcType) {
    setCalcs((prev) => ({ ...prev, [propId]: calc }));
  }

  return (
    <div className="db-calculations" style={{ gridTemplateColumns }}>
      {visibleProperties.map((prop) => (
        <CalcCell
          key={prop.id}
          prop={prop}
          records={records}
          calc={calcs[prop.id] ?? "none"}
          onChange={(c) => setCalc(prop.id, c)}
        />
      ))}
      {/* trailing actions column — empty */}
      <div className="db-calc-cell db-calc-cell--empty" />
    </div>
  );
}
