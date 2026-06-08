import { useMemo } from "react";
import { ArrowRight, Check, Sigma } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { useDataSource } from "../../hooks/use-data-source";
import type {
  AggregationFunction,
  ConfigOf,
  DatabaseProperty,
  PropertyType,
} from "../../types/types";

type RollupConfig = ConfigOf<"rollup">;

const AGG_LABELS: Record<AggregationFunction, string> = {
  count: "Count all",
  count_values: "Count values",
  count_unique: "Count unique values",
  count_empty: "Count empty",
  count_not_empty: "Count not empty",
  percent_empty: "Percent empty",
  percent_not_empty: "Percent not empty",
  sum: "Sum",
  average: "Average",
  median: "Median",
  min: "Min",
  max: "Max",
  range: "Range",
  earliest_date: "Earliest date",
  latest_date: "Latest date",
  date_range: "Date range",
  checked: "Checked",
  unchecked: "Unchecked",
  percent_checked: "Percent checked",
  percent_unchecked: "Percent unchecked",
  show_original: "Show original",
};

// Which aggregations make sense for the target property's type.
function aggregationsFor(
  type: PropertyType | undefined,
): AggregationFunction[] {
  const base: AggregationFunction[] = [
    "count",
    "count_values",
    "count_unique",
    "count_empty",
    "count_not_empty",
    "percent_empty",
    "percent_not_empty",
  ];
  switch (type) {
    case "number":
      return [
        ...base,
        "sum",
        "average",
        "median",
        "min",
        "max",
        "range",
        "show_original",
      ];
    case "date":
    case "created_time":
    case "edited_time":
      return [
        ...base,
        "earliest_date",
        "latest_date",
        "date_range",
        "show_original",
      ];
    case "checkbox":
      return [
        "count",
        "checked",
        "unchecked",
        "percent_checked",
        "percent_unchecked",
      ];
    default:
      return [...base, "show_original"];
  }
}

export function RollupEditDisplay({
  prop,
  properties,
  onChange,
}: {
  prop: DatabaseProperty;
  /** the CURRENT database's schema — used to list relation properties */
  properties: DatabaseProperty[];
  onChange: (config: RollupConfig) => void;
}) {
  const config = prop.config as RollupConfig;

  // Relation properties on THIS database.
  const relationProps = useMemo(
    () => properties.filter((p) => p.config.type === "relation"),
    [properties],
  );

  const selectedRelation = properties.find(
    (p) => p.id === config.relationPropertyId,
  );

  const targetDatabaseId =
    selectedRelation?.config.type === "relation"
      ? selectedRelation.config.targetDatabaseId
      : "";

  // Load the related database to list ITS properties as rollup targets.
  const { source: targetSource } = useDataSource(targetDatabaseId || null);
  const targetProps = targetSource?.properties ?? [];

  const targetProp = targetProps.find((p) => p.id === config.targetPropertyId);
  const aggregations = aggregationsFor(targetProp?.config.type);

  // ── Setters (changing the relation invalidates the downstream picks) ────
  const setRelation = (relationPropertyId: string) =>
    onChange({
      ...config,
      relationPropertyId,
      targetPropertyId: "",
      aggregation: "count",
    });

  const setTargetProperty = (targetPropertyId: string) => {
    const tp = targetProps.find((p) => p.id === targetPropertyId);
    const valid = aggregationsFor(tp?.config.type);
    onChange({
      ...config,
      targetPropertyId,
      // keep current aggregation if still valid, else fall back to count
      aggregation: valid.includes(config.aggregation)
        ? config.aggregation
        : "count",
    });
  };

  const setAggregation = (aggregation: AggregationFunction) =>
    onChange({ ...config, aggregation });

  const row = (
    key: string,
    label: string,
    selected: boolean,
    onClick: () => void,
    icon?: React.ReactNode,
  ) => (
    <Button
      key={key}
      variant="ghost"
      onClick={onClick}
      style={{
        justifyContent: "flex-start",
        width: "100%",
        gap: 8,
        borderRadius: "var(--tt-radius-sm)",
      }}
    >
      {icon}
      <span className="tiptap-button-text">{label}</span>
      {selected && (
        <Check
          size={14}
          style={{ marginLeft: "auto", color: "var(--tt-brand-color-400)" }}
        />
      )}
    </Button>
  );

  return (
    <Card style={{ padding: "5px 10px", minWidth: 250 }}>
      {/* 1. Relation */}
      <CardGroupLabel>Relation</CardGroupLabel>
      <CardItemGroup
        style={{
          maxHeight: 160,
          overflowY: "auto",
          width: "100%",
          justifyContent: "flex-start",
        }}
      >
        {relationProps.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
            No relation properties yet — add one first.
          </span>
        ) : (
          relationProps.map((p) =>
            row(
              p.id,
              p.name,
              p.id === config.relationPropertyId,
              () => setRelation(p.id),
              <ArrowRight className="tiptap-button-icon" size={14} />,
            ),
          )
        )}
      </CardItemGroup>

      <Separator orientation="horizontal" />

      {/* 2. Target property */}
      <CardGroupLabel>Property</CardGroupLabel>
      <CardItemGroup
        style={{
          maxHeight: 160,
          overflowY: "auto",
          width: "100%",
          justifyContent: "flex-start",
        }}
      >
        {!config.relationPropertyId ? (
          <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
            Pick a relation first.
          </span>
        ) : targetProps.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
            Loading related properties…
          </span>
        ) : (
          targetProps.map((p) =>
            row(p.id, p.name, p.id === config.targetPropertyId, () =>
              setTargetProperty(p.id),
            ),
          )
        )}
      </CardItemGroup>

      <Separator orientation="horizontal" />

      {/* 3. Aggregation */}
      <CardGroupLabel>Calculate</CardGroupLabel>
      <CardItemGroup
        style={{
          maxHeight: 200,
          overflowY: "auto",
          width: "100%",
          justifyContent: "flex-start",
        }}
      >
        {!config.targetPropertyId ? (
          <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
            Pick a property to calculate on.
          </span>
        ) : (
          aggregations.map((agg) =>
            row(
              agg,
              AGG_LABELS[agg],
              agg === config.aggregation,
              () => setAggregation(agg),
              <Sigma className="tiptap-button-icon" size={14} />,
            ),
          )
        )}
      </CardItemGroup>
    </Card>
  );
}
