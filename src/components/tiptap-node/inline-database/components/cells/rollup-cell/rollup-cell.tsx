import { useDataSource } from "../../../hooks/use-data-source";
import type {
  AggregationFunction,
  ConfigOf,
  DatabaseProperty,
  ID,
} from "../../../types/types";
import { computeRollup } from "../../../utils/compute-rollup";

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
}: {
  config: ConfigOf<"rollup">;
  record: { id: ID; values: Record<ID, unknown> };
  properties: DatabaseProperty[];
}) {
  const relationProp = properties.find(
    (p) => p.id === config.relationPropertyId,
  );
  const targetDatabaseId =
    relationProp?.config.type === "relation"
      ? relationProp.config.targetDatabaseId
      : null;

  const { source: targetSource } = useDataSource(targetDatabaseId || null);

  const value = computeRollup({ record, properties, targetSource, config });

  return (
    <div className="db-cell" data-wrap="false">
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
