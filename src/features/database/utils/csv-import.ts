import type {
  CellValue,
  DatabaseProperty,
  ID,
  Person,
  PersonValue,
  PropertyConfig,
  PropertyType,
  SelectOption,
  StatusColor,
} from "src/types";
import { DEFAULT_CONFIGS } from "src/types";
import { newId } from "src/lib/id";
import { parseCellText } from "./cell-clipboard";
import { PILL_COLORS } from "./pill-colors";

// Importing a CSV file into a database, without any UI:
//   1. parseCsv           — the file's text → a table of strings
//   2. guessColumn        — for each column: which property it goes into
//                           (matched by name) or which type a new one gets
//   3. planImport         — the properties after the import (new properties,
//                           new select / status options) and one set of
//                           values per row, ready to be created.
// Everything here is pure, so it's covered by csv-import.test.ts.

// ── 1. Parsing ─────────────────────────────────────────────────────────────

export interface CsvTable {
  headers: string[];
  rows: string[][];
  /** The separator found in the file: "," or ";" (French Excel) or tab. */
  delimiter: string;
}

const DELIMITERS = [",", ";", "\t"];

/** The separator used most on the first line, outside quotes. */
function detectDelimiter(text: string): string {
  const counts = new Map(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "\n" || ch === "\r")) break;
    else if (!quoted && counts.has(ch)) counts.set(ch, counts.get(ch)! + 1);
  }
  let best = ",";
  for (const [d, n] of counts) if (n > (counts.get(best) ?? 0)) best = d;
  return best;
}

/**
 * RFC 4180 CSV: quoted fields may hold the separator, line breaks and
 * doubled quotes (""). Handles a UTF-8 byte-order mark, \r\n and \n, and
 * skips lines that are completely empty. The first line is the header.
 */
export function parseCsv(input: string): CsvTable {
  const text = input.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    if (record.some((f) => f.trim() !== "")) records.push(record);
    record = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        field += ch;
      }
      i++;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) endField();
    else if (ch === "\n") endRecord();
    else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      endRecord();
    } else field += ch;
    i++;
  }
  if (field !== "" || record.length > 0) endRecord();

  const [headerRow = [], ...rows] = records;
  const headers = headerRow.map((h, n) => h.trim() || `Column ${n + 1}`);
  // Every row as wide as the header (short rows padded, extra cells dropped).
  const width = headers.length;
  const sized = rows.map((r) =>
    r.length >= width
      ? r.slice(0, width)
      : [...r, ...Array(width - r.length).fill("")],
  );
  return { headers, rows: sized, delimiter };
}

// ── 2. Guessing what each column is ────────────────────────────────────────

/** Where a column goes. */
export type ColumnTarget =
  | { kind: "title" }
  | { kind: "property"; propertyId: ID }
  | { kind: "new"; type: ImportableType; name: string }
  | { kind: "skip" };

/** The types a column can be imported into. Computed types (formula,
 *  rollup, created/edited…) and relations can't be. */
export const IMPORTABLE_TYPES = [
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "checkbox",
  "person",
  "url",
  "email",
  "phone",
] as const satisfies readonly PropertyType[];
export type ImportableType = (typeof IMPORTABLE_TYPES)[number];

export const isImportable = (type: PropertyType): type is ImportableType =>
  (IMPORTABLE_TYPES as readonly string[]).includes(type);

const TITLE_NAMES = ["name", "title", "nom", "titre"];

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/|www\.)\S+$/i;
const BOOL = /^(true|false|yes|no|y|n|oui|non|vrai|faux|x|✓)$/i;

/** "1 250,5" (French) or "1,250.5" (English) or "12" → 1250.5 / 12. */
export function parseNumberText(text: string): number | null {
  let t = text.trim().replace(/[\s\u00A0\u202F]/g, "");
  if (!t) return null;
  t = t.replace(/^[€$£]|[€$£%]$/g, "");
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma > lastDot) {
    // the comma is the decimal mark: "1.250,5" or "12,5"
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    t = t.replace(/,/g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type DateOrder = "ymd" | "dmy" | "mdy";

const DATE_RE =
  /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})(?:[ T](\d{1,2}):(\d{2}))?/;

/**
 * Which order a column's dates are written in. ISO (2026-10-19) is
 * year-first. For 03/04/2026 a day above 12 decides; when nothing does,
 * `fallback` (from the person's language: dmy in French, mdy in English).
 */
export function detectDateOrder(
  values: string[],
  fallback: "dmy" | "mdy",
): DateOrder {
  let dmy = false;
  let mdy = false;
  for (const v of values) {
    const m = v.trim().match(DATE_RE);
    if (!m) continue;
    if (m[1].length === 4) return "ymd";
    if (Number(m[1]) > 12) dmy = true;
    if (Number(m[2]) > 12) mdy = true;
  }
  if (dmy && !mdy) return "dmy";
  if (mdy && !dmy) return "mdy";
  return fallback;
}

/** "19/10/2026" → an ISO string for that local day (how date cells store
 *  a day). Null when it isn't a date. */
export function parseDateText(text: string, order: DateOrder): string | null {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(DATE_RE);
  if (m) {
    const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const [y, mo, d] =
      order === "ymd" ? [a, b, c] : order === "dmy" ? [c, b, a] : [c, a, b];
    const year = y < 100 ? 2000 + y : y;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const date = new Date(
      year,
      mo - 1,
      d,
      m[4] ? Number(m[4]) : 0,
      m[5] ? Number(m[5]) : 0,
    );
    // Rejects 31/02 (rolls into March).
    if (date.getMonth() !== mo - 1) return null;
    return date.toISOString();
  }
  // "Oct 19, 2026", "19 October 2026"…
  const time = Date.parse(t);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** Splits a multi-value cell: "Graded, Online" / "Graded; Online". */
export const splitList = (text: string) =>
  text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** The type a new property should get, from the column's values. */
export function guessType(values: string[]): ImportableType {
  const filled = values.map((v) => v.trim()).filter(Boolean);
  if (filled.length === 0) return "text";
  const all = (test: (v: string) => boolean) => filled.every(test);

  if (all((v) => parseNumberText(v) !== null)) return "number";
  if (all((v) => BOOL.test(v))) return "checkbox";
  if (all((v) => DATE_RE.test(v))) return "date";
  if (all((v) => EMAIL.test(v))) return "email";
  if (all((v) => URL_RE.test(v))) return "url";

  const longest = Math.max(...filled.map((v) => v.length));
  if (longest > 60) return "text";
  // A few values, repeated: options. With separators: several per row.
  const listy = filled.some((v) => /[,;]/.test(v));
  const items = listy ? filled.flatMap(splitList) : filled;
  const distinct = new Set(items.map((v) => v.toLowerCase()));
  const repeated = distinct.size <= Math.max(1, items.length / 2);
  if (distinct.size <= 20 && repeated) return listy ? "multi_select" : "select";
  return "text";
}

/** The first guess for each column: the title, an existing property with
 *  the same name, else a new property of the guessed type. */
export function guessColumns(
  table: CsvTable,
  properties: DatabaseProperty[],
): ColumnTarget[] {
  const titleProp = properties.find((p) => p.config.type === "title");
  const used = new Set<ID>();
  let hasTitle = false;

  const targets = table.headers.map((header, col): ColumnTarget => {
    const isTitleName =
      TITLE_NAMES.some((n) => same(n, header)) ||
      (!!titleProp && same(titleProp.name, header));
    if (isTitleName && !hasTitle) {
      hasTitle = true;
      return { kind: "title" };
    }
    const existing = properties.find(
      (p) =>
        same(p.name, header) && !used.has(p.id) && isImportable(p.config.type),
    );
    if (existing) {
      used.add(existing.id);
      return { kind: "property", propertyId: existing.id };
    }
    return {
      kind: "new",
      type: guessType(table.rows.map((r) => r[col])),
      name: header,
    };
  });

  // No column named like a title: the first one is the title.
  if (!hasTitle && targets.length > 0) targets[0] = { kind: "title" };
  return targets;
}

// ── 3. Planning the rows ───────────────────────────────────────────────────

export interface ImportContext {
  /** Workspace members, matched by email or name for person columns. */
  people: Person[];
  /** The order of ambiguous dates (03/04/2026). */
  dateFallback: "dmy" | "mdy";
}

export interface ImportPlan {
  /** The database's properties after the import: new properties at the
   *  end, new options added to select, multi-select and status. */
  properties: DatabaseProperty[];
  rows: { title: string; values: Record<ID, CellValue> }[];
  /** Cells that couldn't be read (a word in a number column…), per column. */
  skippedCells: number[];
  /** Person cells naming nobody in the workspace, per column. */
  unknownPeople: number[];
  /** New options added, per column. */
  newOptions: number[];
}

const OPTION_COLORS = PILL_COLORS.filter((c) => c !== "gray");
const STATUS_COLORS: StatusColor[] = [
  "orange",
  "purple",
  "yellow",
  "red",
  "blue",
  "green",
];

/** Adds the labels this column uses that the property doesn't have yet. */
function withNewOptions(
  config: PropertyConfig,
  labels: string[],
): { config: PropertyConfig; added: number } {
  const wanted = [...new Map(labels.map((l) => [l.toLowerCase(), l])).values()];

  if (config.type === "select" || config.type === "multi_select") {
    const missing = wanted.filter(
      (l) => !config.options.some((o) => same(o.label, l)),
    );
    const options: SelectOption[] = [
      ...config.options,
      ...missing.map((label, n) => ({
        id: newId(),
        label,
        color:
          OPTION_COLORS[(config.options.length + n) % OPTION_COLORS.length],
      })),
    ];
    return { config: { ...config, options }, added: missing.length };
  }

  if (config.type === "status") {
    const items = config.groups.flatMap((g) => g.items);
    const missing = wanted.filter((l) => !items.some((i) => same(i.name, l)));
    if (!missing.length) return { config, added: 0 };
    // New statuses go in the first group ("To do").
    const groups = config.groups.map((g, gi) =>
      gi === 0
        ? {
            ...g,
            items: [
              ...g.items,
              ...missing.map((name, n) => ({
                id: newId(),
                name,
                color: STATUS_COLORS[n % STATUS_COLORS.length],
                isDefault: false,
              })),
            ],
          }
        : g,
    );
    return { config: { ...config, groups }, added: missing.length };
  }

  return { config, added: 0 };
}

function findPerson(people: Person[], text: string): PersonValue | null {
  const p = people.find(
    (x) => same(x.email ?? "", text) || same(x.name ?? "", text),
  );
  if (!p) return null;
  return {
    id: p.id,
    name: p.name || p.email,
    ...(p.avatarUrl ? { avatarUrl: p.avatarUrl } : {}),
  };
}

/** One cell's text as the value of `property` (undefined = can't read it). */
function readCell(
  property: DatabaseProperty,
  text: string,
  order: DateOrder,
  ctx: ImportContext,
): { value: CellValue | null; unknownPerson?: boolean } | undefined {
  const t = text.trim();
  const config = property.config;
  switch (config.type) {
    case "number": {
      if (!t) return { value: null };
      const n = parseNumberText(t);
      return n === null ? undefined : { value: n };
    }
    case "date": {
      if (!t) return { value: null };
      const iso = parseDateText(t, order);
      return iso === null ? undefined : { value: iso };
    }
    case "checkbox":
      return { value: /^(true|yes|y|1|x|✓|oui|vrai)$/i.test(t) };
    case "multi_select": {
      const options = splitList(t)
        .map((label) => config.options.find((o) => same(o.label, label)))
        .filter((o): o is SelectOption => !!o);
      return { value: options };
    }
    case "person": {
      if (!t) return { value: [] };
      const found = splitList(t).map((x) => findPerson(ctx.people, x));
      const matched = found.filter((p): p is PersonValue => !!p);
      return {
        value: config.limit === "single" ? matched.slice(0, 1) : matched,
        unknownPerson: found.length > matched.length,
      };
    }
    default: {
      const parsed = parseCellText(property, text);
      return parsed ?? undefined;
    }
  }
}

/**
 * The properties after the import and the values of every row.
 * `targets[i]` says where column i goes.
 */
export function planImport(
  table: CsvTable,
  targets: ColumnTarget[],
  properties: DatabaseProperty[],
  ctx: ImportContext,
): ImportPlan {
  const columns = table.headers.length;
  const next = [...properties];
  const propOfColumn: (DatabaseProperty | null)[] = [];
  const newOptions = Array(columns).fill(0);

  for (let col = 0; col < columns; col++) {
    const target = targets[col] ?? { kind: "skip" };
    if (target.kind === "title" || target.kind === "skip") {
      propOfColumn.push(null);
      continue;
    }
    let prop: DatabaseProperty | undefined;
    if (target.kind === "new") {
      prop = {
        id: newId(),
        name: target.name.trim() || table.headers[col],
        config: structuredClone(DEFAULT_CONFIGS[target.type]),
        width: 160,
      };
      next.push(prop);
    } else {
      prop = next.find((p) => p.id === target.propertyId);
    }
    if (!prop) {
      propOfColumn.push(null);
      continue;
    }
    // Options this column needs.
    const type = prop.config.type;
    if (type === "select" || type === "multi_select" || type === "status") {
      const values = table.rows.map((r) => r[col]);
      const labels =
        type === "multi_select"
          ? values.flatMap(splitList)
          : values.map((v) => v.trim()).filter(Boolean);
      const { config, added } = withNewOptions(prop.config, labels);
      newOptions[col] = added;
      const updated = { ...prop, config };
      next[next.findIndex((p) => p.id === prop!.id)] = updated;
      prop = updated;
    }
    propOfColumn.push(prop);
  }

  const orders = propOfColumn.map((p, col) =>
    p?.config.type === "date"
      ? detectDateOrder(
          table.rows.map((r) => r[col]),
          ctx.dateFallback,
        )
      : ctx.dateFallback,
  );
  const titleCol = targets.findIndex((t) => t.kind === "title");
  const skippedCells = Array(columns).fill(0);
  const unknownPeople = Array(columns).fill(0);

  const rows = table.rows.map((cells) => {
    const values: Record<ID, CellValue> = {};
    cells.forEach((text, col) => {
      const prop = propOfColumn[col];
      if (!prop) return;
      const read = readCell(prop, text, orders[col], ctx);
      if (read === undefined) {
        if (text.trim()) skippedCells[col]++;
        return;
      }
      if (read.unknownPerson) unknownPeople[col]++;
      values[prop.id] = read.value as CellValue;
    });
    return { title: titleCol >= 0 ? cells[titleCol].trim() : "", values };
  });

  return { properties: next, rows, skippedCells, unknownPeople, newOptions };
}
