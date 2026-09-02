import type { DatabaseProperty, Page, CalcType } from "src/types";

export const CALC_LABEL: Record<CalcType, string> = {
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

export type CalcGroup = { label: string; calcs: CalcType[] };

export function getCalcGroups(prop: DatabaseProperty): CalcGroup[] {
  // Every property supports the Count group — you can always count/percentage
  // how many rows have a value, regardless of type.
  const groups: CalcGroup[] = [{ label: "Count", calcs: BASE_CALCS }];

  const type = prop.config.type;
  if (type === "number") {
    groups.push({ label: "Number", calcs: NUMBER_CALCS });
  }
  if (type === "date" || type === "created_time" || type === "edited_time") {
    groups.push({ label: "Date", calcs: DATE_CALCS });
  }
  return groups;
}

export function getCellValue(record: Page, propertyId: string): unknown {
  return record.values?.[propertyId] ?? null;
}

export function runCalc(calc: CalcType, values: unknown[]): string {
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
