import type { CellValue, DatabaseProperty, SelectOption } from "../types";

// The initial cell value for a freshly-created row, per property type.
// This is the content-seeding-at-creation decision: what does a cell hold
// before the user touches it?
//
// Most types seed empty (null / [] / ""), matching Notion — a new row is blank
// so the user fills it in. The exceptions are types whose CONFIG can designate
// a default: status (StatusItem.isDefault) and select (SelectOption.isDefault),
// which pre-select that option on every new row.
export function initialCellValue(property: DatabaseProperty): CellValue {
  const config = property.config;

  switch (config.type) {
    // ── Configured defaults ────────────────────────────────────────────────
    case "status": {
      // First item flagged isDefault across all groups, else null.
      const items = config.groups.flatMap((g) => g.items);
      const def = items.find((i) => i.isDefault);
      return def ? def.id : null; // CellValueMap["status"] = ID | null
    }
    case "select": {
      // Requires SelectOption.isDefault (optional field). Falls back to null.
      const def = (config.options as SelectOption[]).find((o) => o.isDefault);
      return def ?? null; // CellValueMap["select"] = SelectOption
    }
    case "multi_select": {
      // Any options flagged default seed the initial multi-selection.
      return (config.options as SelectOption[]).filter((o) => o.isDefault);
      // CellValueMap["multi_select"] = SelectOption[]
    }

    // ── Empty defaults ──────────────────────────────────────────────────────
    case "relation":
      return []; // no linked records yet
    case "person":
      return []; // CellValueMap["person"] = PersonValue[]
    case "checkbox":
      return false; // unchecked is a real, valid default
    case "number":
      return null; // null = "no value"; 0 would be a real number
    case "text":
    case "title":
      return ""; // content-based, empty string
    case "url":
    case "email":
    case "phone":
      return ""; // CellValueMap for these is `string`, not nullable

    case "date":
      return null;

    // Computed / system — never seeded; derived on read.
    case "rollup":
    case "formula":
    case "created_time":
    case "created_by":
    case "edited_time":
    case "edited_by":
      return null;

    default:
      return null;
  }
}
