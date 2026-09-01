import type { PropertyType } from "src/types";

/**
 * Which property types produce a plain-text value worth copying. Structured
 * pick-types (status, select, person, checkbox…) aren't copiable — there's no
 * meaningful single string to put on the clipboard.
 */
const COPIABLE_TYPES = new Set<PropertyType>([
  "text",
  "number",
  "email",
  "url",
  "phone",
  "formula",
  "created_time",
  "edited_time",
  "date",
]);

export function isCopiableType(type: PropertyType): boolean {
  return COPIABLE_TYPES.has(type);
}
