import type {
  CellValue,
  DatabaseProperty,
  DatabaseView,
  Page,
} from "src/types";

// Which of a record's properties a card shows beside its title, and in what
// order — for a board card, a gallery card, and a bar on a timeline.
//
// A card is small, so it shows what there is to show: the title is drawn
// separately, hidden properties are the view's business, and a property the
// record has no value for would be an empty space with a name on it.

/** Nothing worth showing. A checkbox always is: unticked is a value. */
export function isEmptyCellValue(
  value: CellValue | null,
  prop: DatabaseProperty,
): boolean {
  if (prop.config.type === "checkbox") return false;
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** The properties a card shows, in the order the view puts its columns. */
export function cardProperties(
  properties: DatabaseProperty[],
  record: Page,
  view: Pick<DatabaseView, "hiddenProperties"> | null | undefined,
): DatabaseProperty[] {
  const hidden = new Set(view?.hiddenProperties ?? []);
  return properties.filter((p) => {
    if (p.config.type === "title") return false;
    if (hidden.has(p.id)) return false;
    return !isEmptyCellValue(
      (record.values?.[p.id] ?? null) as CellValue | null,
      p,
    );
  });
}
