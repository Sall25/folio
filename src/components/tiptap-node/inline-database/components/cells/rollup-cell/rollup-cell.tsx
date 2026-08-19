import { useDataSource } from "../../../hooks/use-data-source";
import type {
  AggregationFunction,
  ConfigOf,
  DatabaseProperty,
  Page,
} from "src/types";
import { computeRollup } from "src/lib/compute-rollup";
import { useRows } from "src/hooks/use-pages";

function formatRollup(
  value: string | number | null,
  agg: AggregationFunction,
): string {
  if (value === null || value === "") return "";
  if (agg === "earliest_date" || agg === "latest_date") {
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  if (agg === "date_range") return `${value} days`;
  if (agg.startsWith("percent_")) return `${value}%`;
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

/**
 * Rollup cell — computed + read-only. Resolves the relation's target database,
 * loads it, and renders the aggregated value. Special-cased in the dispatcher
 * (gets `record` + `properties`) because a rollup needs the record's relation
 * value and the schema, which CellProps alone doesn't carry.
 */
export function RollupCell({
  config,
  record,
  properties,
  className,
}: {
  config: ConfigOf<"rollup">;
  record: Page;
  properties: DatabaseProperty[];
  className?: string;
}) {
  const relationProp = properties.find(
    (p) => p.id === config.relationPropertyId,
  );
  const targetSourceId =
    relationProp?.config.type === "relation"
      ? relationProp.config.targetSourceId
      : null;

  const { source: targetSource } = useDataSource(targetSourceId || null);

  // The linked ids point at TARGET-database rows, and computeRollup reads each
  // linked row's values[targetPropertyId]. usePages() didn't supply those rows
  // with values, so every aggregation except `count` (which only needs
  // ids.length) came back empty. Load the target source's rows explicitly —
  // the same set the relation cell resolves against.
  const { data: targetRows } = useRows(targetSourceId || "");

  const value = computeRollup({
    record: { values: record.values! },
    properties,
    targetSource,
    config,
    pages: targetRows ?? [],
  });

  return (
    <div className={className} data-wrap="false">
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: 34,
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--tt-text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {formatRollup(value, config.aggregation)}
      </span>
    </div>
  );
}
