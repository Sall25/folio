import type { ColorRule, DatabaseProperty, ID, Page } from "src/types";
import { normalizeColor, type PillColor } from "./pill-colors";
import { recordMatchesRule, type FilterContext } from "./apply-filters";

// Conditional color: a view's rules, each a filter condition and a colour.
// A record takes the colour of the FIRST rule it matches; in a table, a
// "cell only" rule paints just its property's cell instead (again, the first
// match per cell wins), and doesn't stop a later rule colouring the row.

export interface RecordColors {
  row?: PillColor;
  cells?: Record<ID, PillColor>;
}

/** "default" on a select / multi-select / status rule: the colour of the
 *  option it picks (its first one). Gray for everything else. */
function ruleColor(rule: ColorRule, properties: DatabaseProperty[]): PillColor {
  if (rule.color && rule.color !== "default") return normalizeColor(rule.color);
  const property = properties.find((p) => p.id === rule.rule.propertyId);
  const picked = Array.isArray(rule.rule.value)
    ? (rule.rule.value as string[]).find(Boolean)
    : undefined;
  if (!property || !picked) return "gray";
  const config = property.config;
  if (config.type === "select" || config.type === "multi_select") {
    const option = config.options.find((o) => o.id === picked);
    return normalizeColor(option?.color);
  }
  if (config.type === "status") {
    for (const group of config.groups) {
      const item = group.items.find(
        (i) => i.id === picked || i.name === picked,
      );
      if (item) return normalizeColor(item.color);
    }
  }
  return "gray";
}

export function computeRecordColors(
  records: Iterable<Page>,
  rules: ColorRule[] | undefined,
  properties: DatabaseProperty[],
  ctx: FilterContext = {},
  cellsAllowed = false,
): Record<ID, RecordColors> {
  const out: Record<ID, RecordColors> = {};
  if (!rules || rules.length === 0) return out;

  for (const record of records) {
    const colors: RecordColors = {};
    for (const rule of rules) {
      const cellRule = cellsAllowed && !!rule.cellOnly;
      if (!cellRule && colors.row) continue;
      if (cellRule && colors.cells?.[rule.rule.propertyId]) continue;
      if (!recordMatchesRule(record, rule.rule, properties, ctx)) continue;
      const color = ruleColor(rule, properties);
      if (cellRule) {
        colors.cells = { ...colors.cells, [rule.rule.propertyId]: color };
      } else {
        colors.row = color;
      }
    }
    if (colors.row || colors.cells) out[record.id] = colors;
  }
  return out;
}
