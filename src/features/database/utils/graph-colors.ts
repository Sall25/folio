import type { DatabaseProperty } from "src/types";
import { getColumnDefs } from "../nodes/database-board-node-view/utils";
import { groupLabelFor, NO_GROUP_KEY, type GroupContext } from "./group-key";
import { normalizeColor, PILL_COLORS } from "./pill-colors";

// What a coloured node means, in words and in the colour the rest of the
// database already uses for it.
//
// A node's colour key is a value's key — an option's id for a select or a
// status, a person's id, a day. An id is not a label and is certainly not a
// colour, so this turns the keys a graph is holding into the same labels and
// the same accents the board's columns and the table's pills show. One
// vocabulary, so a status that is orange on the board is orange here.

export interface GraphLegendEntry {
  key: string;
  label: string;
  /** A CSS colour: the database's accent for this value. */
  accent: string;
}

/** Accents for values that carry no colour of their own — a person, a date,
 *  a number — handed out in the order the values first appear, and skipping
 *  gray, which is what an uncoloured node already is. */
const SPARE = PILL_COLORS.filter((c) => c !== "gray" && c !== "slate");

export const accentVar = (color: string | null | undefined) =>
  `var(--tt-color-accent-${normalizeColor(color)})`;

/**
 * The legend for the keys a graph is actually showing, in the order they
 * first appear — so it says what is on the canvas and nothing else.
 */
export function graphLegend(
  property: DatabaseProperty | undefined,
  keys: string[],
  ctx: GroupContext = {},
): GraphLegendEntry[] {
  if (!property) return [];
  const defs = new Map(getColumnDefs(property).map((d) => [d.id, d]));
  let spare = 0;
  return keys
    .filter((key) => key && key !== NO_GROUP_KEY)
    .map((key) => {
      const def = defs.get(key);
      const color = def?.color;
      return {
        key,
        label: def?.label ?? groupLabelFor(key, property, ctx),
        accent: accentVar(color ?? SPARE[spare++ % SPARE.length]),
      };
    });
}
