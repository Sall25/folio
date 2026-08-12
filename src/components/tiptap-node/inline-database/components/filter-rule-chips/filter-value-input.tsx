import {
  type DatabaseProperty,
  type FilterRule,
  type ID,
  type PropertyConfig,
  type SelectOption,
} from "src/types";
import { OptionDropdown } from "./option-dropdown";

export function FilterValueInput({
  rule,
  property,
  onChange,
}: {
  rule: FilterRule;
  property: DatabaseProperty;
  onChange: (patch: Partial<FilterRule>) => void;
}) {
  const config = property.config;
  const type = rule.propertyType;
  const current = (rule.value as string) ?? "";

  if (type === "select" || type === "multi_select") {
    const options =
      "options" in config
        ? (config as Extract<PropertyConfig, { options: SelectOption[] }>)
            .options
        : [];
    return (
      <OptionDropdown
        current={current}
        options={options.map((o) => ({ id: o.id, label: o.label }))}
        onSelect={(id) => onChange({ value: id } as Partial<FilterRule>)}
      />
    );
  }

  if (type === "status") {
    const groups =
      "groups" in config
        ? (config as { groups: { items: { id: ID; name: string }[] }[] }).groups
        : [];
    const options = groups
      .flatMap((g) => g.items)
      .map((i) => ({ id: String(i.id), label: i.name }));
    return (
      <OptionDropdown
        current={current}
        options={options}
        onSelect={(id) => onChange({ value: id } as Partial<FilterRule>)}
      />
    );
  }

  if (type === "date" || type === "created_time" || type === "edited_time") {
    if (rule.operator === "is_within") {
      const opts = [
        { id: "past_week", label: "Past week" },
        { id: "past_month", label: "Past month" },
        { id: "the_past_7_days", label: "Past 7 days" },
        { id: "the_past_30_days", label: "Past 30 days" },
        { id: "next_week", label: "Next week" },
        { id: "next_month", label: "Next month" },
      ];
      return (
        <OptionDropdown
          current={current}
          options={opts}
          includeAny={false}
          onSelect={(id) => onChange({ value: id } as Partial<FilterRule>)}
        />
      );
    }
    return (
      <input
        className="db-chip__input"
        type="date"
        value={(rule.value as string) ?? ""}
        onChange={(e) =>
          onChange({ value: e.target.value } as Partial<FilterRule>)
        }
      />
    );
  }

  if (type === "number") {
    return (
      <input
        className="db-chip__input"
        type="number"
        value={(rule.value as number) ?? ""}
        onChange={(e) =>
          onChange({ value: Number(e.target.value) } as Partial<FilterRule>)
        }
        placeholder="Value"
      />
    );
  }

  return (
    <input
      className="db-chip__input"
      type="text"
      value={(rule.value as string) ?? ""}
      onChange={(e) =>
        onChange({ value: e.target.value } as Partial<FilterRule>)
      }
      placeholder="Value"
    />
  );
}
