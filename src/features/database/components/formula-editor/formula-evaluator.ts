/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  DatabaseProperty,
  CellValue,
  PropertyType,
  CellValueMap,
  Page,
} from "src/types";
import { getFormulaEngine, loadFormulaEngine } from "./formula-engine";

// ─── expression pre-processing ────────────────────────────────────────────────

// Rename Notion functions that clash with JS/mathjs reserved words. Only
// calls are renamed (`if(` → `_if(`), and never inside "text" or 'text', so
// a string like "Yes and no" or the operator form `a and b` stay as they are.
const RESERVED_CALLS: [RegExp, string][] = [
  [/\bif(\s*\()/g, "_if$1"],
  [/\blets(\s*\()/g, "_lets$1"],
  [/\blet(\s*\()/g, "_let$1"],
  [/\band(\s*\()/g, "_and$1"],
  [/\bor(\s*\()/g, "_or$1"],
  [/\bnot(\s*\()/g, "_not$1"],
];

function preprocessExpression(expression: string): string {
  // Split into code and quoted-string parts; rename in code parts only.
  const parts = expression.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // a string literal
      let out = part;
      for (const [pattern, replacement] of RESERVED_CALLS) {
        out = out.replace(pattern, replacement);
      }
      return out;
    })
    .join("");
}

// prop("Name") → __prop_2__: the variable holding the third property's value.
// Properties are numbered rather than named, so any name works (accents,
// quotes, symbols) and "Prix (€)" and "Prix (£)" stay two variables.
function propVarName(index: number): string {
  return `__prop_${index}__`;
}

// prop("Date d'échéance"), prop('x'), prop( "x" ) and prop("Say \"hi\"") all
// name a property. A name no property has is left as it is and fails on
// evaluation like any other unknown call.
const PROP_CALL = /prop\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;

function substitutePropCalls(
  expression: string,
  properties: DatabaseProperty[],
): string {
  return expression.replace(PROP_CALL, (call: string, quoted: string) => {
    const name = quoted.slice(1, -1).replace(/\\(.)/g, "$1");
    const index = properties.findIndex((p) => p.name === name);
    return index === -1 ? call : propVarName(index);
  });
}

// The prop("...") call for a property, with " and \ escaped so any name works.
export function propCall(name: string): string {
  return `prop("${name.replace(/[\\"]/g, "\\$&")}")`;
}

// ─── cell value → formula value ───────────────────────────────────────────────

// What prop("X") gives inside a formula. Values that live on the page itself
// (title, created / edited time and person) come from `page` when the caller
// passes it; a status is stored as an item id and becomes its name; a date
// range gives its start; people give a list of names.
function cellToFormulaValue(
  prop: DatabaseProperty,
  value: CellValue,
  page: Page | undefined,
  personName?: (id: string) => string | undefined,
): string | number | boolean | unknown[] | null {
  const type: PropertyType = prop.config.type;

  switch (type) {
    case "title":
      return page ? (page.title ?? "") : ((value as string) ?? null);
    case "created_time":
      return page?.createdAt != null
        ? new Date(page.createdAt).toISOString()
        : null;
    case "edited_time": {
      const t = page?.updatedAt ?? page?.createdAt;
      return t != null ? new Date(t).toISOString() : null;
    }
    case "created_by":
    case "edited_by": {
      const id =
        type === "edited_by"
          ? ((page as (Page & { editedBy?: string | null }) | undefined)
              ?.editedBy ?? page?.ownerId)
          : page?.ownerId;
      if (!id) return null;
      // The person's name when the caller can look it up, else the id.
      return personName?.(id) ?? id;
    }
  }

  if (value === null || value === undefined) return null;

  switch (type) {
    case "text":
    case "url":
    case "email":
    case "phone":
      return value as string;

    case "number":
    case "unique_id": // its number (the prefix is display only)
      return (value as number) ?? null;

    case "checkbox":
      return value as boolean;

    case "select": {
      const v = value as CellValueMap["select"];
      return v?.label ?? null;
    }

    case "status": {
      if (prop.config.type !== "status") return null;
      for (const g of prop.config.groups)
        for (const item of g.items)
          if (item.id === value || item.name === value) return item.name;
      return null;
    }

    case "multi_select": {
      const v = value as CellValueMap["multi_select"];
      return v?.map((o) => o.label).join(", ") ?? "";
    }

    case "date": {
      if (typeof value === "string") return value;
      const range = value as { start?: string };
      return range?.start ?? null;
    }

    case "person":
      return Array.isArray(value)
        ? (value as { name?: string; id?: string }[]).map(
            (p) => p?.name ?? p?.id ?? "",
          )
        : null;

    case "files":
      // The files' names: enough for length(), empty() and contains().
      return Array.isArray(value)
        ? (value as { name?: string; url?: string }[]).map(
            (f) => f?.name ?? f?.url ?? "",
          )
        : null;

    case "relation":
      // Linked rows' titles when cached on the value, else their ids — enough
      // for length() and empty().
      return Array.isArray(value)
        ? (value as unknown[]).map((v) =>
            typeof v === "string"
              ? v
              : String(
                  (v as { title?: string; pageId?: string })?.title ??
                    (v as { pageId?: string })?.pageId ??
                    "",
                ),
          )
        : null;

    case "formula":
      // Another formula's computed value (resolved before this one).
      return typeof value === "object" ? null : (value as string);

    case "rollup":
      // The rollup's computed value (resolved into the row upstream).
      return typeof value === "object" ? null : (value as string | number);

    default:
      return null;
  }
}

// ISO 8601 week number (weeks start on Monday; week 1 holds the year's first
// Thursday), as Notion's week() gives it.
function isoWeek(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Thursday of this week
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  firstThursday.setDate(
    firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7),
  );
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / 604_800_000);
}

// ─── Notion built-in function scope ───────────────────────────────────────────

function buildFunctionScope(): Record<string, unknown> {
  function parseAnyDate(v: unknown): Date {
    if (typeof v === "string") return new Date(v);
    if (v instanceof Date) return v;
    throw new Error(`Cannot parse date from ${v}`);
  }

  // Date functions given an empty date give an empty result (Notion does
  // the same) instead of throwing and blanking the whole formula.
  const dateFn =
    <A extends unknown[]>(fn: (d: unknown, ...rest: A) => unknown) =>
    (d: unknown, ...rest: A) =>
      d == null || d === "" ? null : fn(d, ...rest);

  return {
    // ── Logic (renamed to avoid reserved word conflicts) ───────────────────
    // _if, ifs, _and, _or are lazy and live on the math instance (above);
    // defining them here would shadow those.
    _not: (a: unknown) => !a,
    _let: (_name: unknown, _val: unknown, expr: unknown) => expr,
    _lets: (...args: unknown[]) => args[args.length - 1],

    empty: (v: unknown) =>
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0) ||
      v === 0,

    // ── Text ───────────────────────────────────────────────────────────────
    length: (v: string | unknown[]) => (v == null ? 0 : (v as any).length),
    substring: (s: string, start: number, end?: number) =>
      s == null ? null : String(s).substring(start, end),
    contains: (s: string, search: string) =>
      s == null ? false : String(s).includes(search),
    test: (s: string, regex: string) =>
      s == null ? false : new RegExp(regex).test(String(s)),
    match: (s: string, regex: string) =>
      s == null ? [] : (String(s).match(new RegExp(regex, "g")) ?? []),
    replace: (s: string, regex: string, rep: string) =>
      s == null ? null : String(s).replace(new RegExp(regex), rep),
    replaceAll: (s: string, regex: string, rep: string) =>
      s == null ? null : String(s).replaceAll(new RegExp(regex, "g"), rep),
    lower: (s: string) => (s == null ? null : String(s).toLowerCase()),
    upper: (s: string) => (s == null ? null : String(s).toUpperCase()),
    repeat: (s: string, n: number) => (s == null ? null : String(s).repeat(n)),
    link: (label: string, url: string) => `[${label}](${url})`,
    style: (s: string, ..._styles: string[]) => s,
    unstyle: (s: string) => s,
    format: (v: unknown) => (v == null ? "" : String(v)),
    trim: (s: string) => (s == null ? null : String(s).trim()),
    toNumber: (v: unknown) => (v == null || v === "" ? null : Number(v)),

    // ── Date ───────────────────────────────────────────────────────────────
    now: () => new Date().toISOString(),
    today: () => new Date().toISOString().slice(0, 10),
    parseDate: (s: string) => new Date(s).toISOString(),
    timestamp: dateFn((d: unknown) => parseAnyDate(d).getTime()),
    fromTimestamp: (ms: number) => new Date(ms).toISOString(),
    formatDate: dateFn((d: unknown, fmt: string) => {
      const date = parseAnyDate(d);
      const weekNum = isoWeek(date);

      const tokens: Record<string, string> = {
        dddd: date.toLocaleString("en", { weekday: "long" }),
        ddd: date.toLocaleString("en", { weekday: "short" }),
        MMMM: date.toLocaleString("en", { month: "long" }),
        MMM: date.toLocaleString("en", { month: "short" }),
        MM: String(date.getMonth() + 1).padStart(2, "0"),
        YYYY: String(date.getFullYear()),
        YY: String(date.getFullYear()).slice(-2),
        DD: String(date.getDate()).padStart(2, "0"),
        D: String(date.getDate()),
        HH: String(date.getHours()).padStart(2, "0"),
        hh: String(date.getHours() % 12 || 12).padStart(2, "0"),
        h: String(date.getHours() % 12 || 12),
        mm: String(date.getMinutes()).padStart(2, "0"),
        ss: String(date.getSeconds()).padStart(2, "0"),
        A: date.getHours() >= 12 ? "PM" : "AM",
        a: date.getHours() >= 12 ? "pm" : "am",
        w: String(weekNum),
      };

      const pattern = new RegExp(
        Object.keys(tokens)
          .sort((a, b) => b.length - a.length) // longer tokens first
          .join("|"),
        "g",
      );

      return fmt.replace(pattern, (match) => tokens[match] ?? match);
    }),
    dateBetween: (a: unknown, b: unknown, unit: string) => {
      if (a == null || a === "" || b == null || b === "") return null;
      const ms = parseAnyDate(a).getTime() - parseAnyDate(b).getTime();
      const units: Record<string, number> = {
        milliseconds: 1,
        seconds: 1000,
        minutes: 60_000,
        hours: 3_600_000,
        days: 86_400_000,
        weeks: 604_800_000,
        months: 30 * 86_400_000,
        years: 365 * 86_400_000,
      };
      return Math.round(ms / (units[unit] ?? 1));
    },
    dateAdd: dateFn((d: unknown, n: number, unit: string) => {
      const ms: Record<string, number> = {
        minutes: 60_000,
        hours: 3_600_000,
        days: 86_400_000,
        weeks: 604_800_000,
        months: 30 * 86_400_000,
        years: 365 * 86_400_000,
      };
      return new Date(
        parseAnyDate(d).getTime() + n * (ms[unit] ?? 0),
      ).toISOString();
    }),
    dateSubtract: dateFn((d: unknown, n: number, unit: string) => {
      const ms: Record<string, number> = {
        minutes: 60_000,
        hours: 3_600_000,
        days: 86_400_000,
        weeks: 604_800_000,
        months: 30 * 86_400_000,
        years: 365 * 86_400_000,
      };
      return new Date(
        parseAnyDate(d).getTime() - n * (ms[unit] ?? 0),
      ).toISOString();
    }),
    minute: dateFn((d: unknown) => parseAnyDate(d).getMinutes()),
    hour: dateFn((d: unknown) => parseAnyDate(d).getHours()),
    day: dateFn((d: unknown) => parseAnyDate(d).getDay() || 7),
    date: dateFn((d: unknown) => parseAnyDate(d).getDate()),
    month: dateFn((d: unknown) => parseAnyDate(d).getMonth() + 1),
    year: dateFn((d: unknown) => parseAnyDate(d).getFullYear()),
    week: dateFn((d: unknown) => isoWeek(parseAnyDate(d))),

    // ── List ───────────────────────────────────────────────────────────────
    at: (list: unknown[], i: number) => (list == null ? null : list[i]),
    first: (list: unknown[]) => (list == null ? null : list[0]),
    last: (list: unknown[]) => (list == null ? null : list[list.length - 1]),
    slice: (list: unknown[], s: number, e?: number) =>
      list == null ? [] : list.slice(s, e),
    concat: (...lists: unknown[][]) =>
      ([] as unknown[]).concat(...lists.map((l) => l ?? [])),
    sort: (list: unknown[]) => (list == null ? [] : [...list].sort()),
    reverse: (list: unknown[]) => (list == null ? [] : [...list].reverse()),
    join: (list: unknown[], sep: string) =>
      list == null ? "" : list.join(sep),
    split: (s: string, sep: string) =>
      s == null || s === "" ? [] : String(s).split(sep),
    unique: (list: unknown[]) => (list == null ? [] : [...new Set(list)]),
    includes: (list: unknown[], v: unknown) =>
      list == null ? false : list.includes(v),
    flat: (list: unknown[][]) => (list == null ? [] : list.flat()),
  };
}

// ─── cast result ──────────────────────────────────────────────────────────────

function castResult(result: unknown): string | number | boolean | null {
  if (result === null || result === undefined) return null;
  if (typeof result === "boolean") return result;
  if (typeof result === "number") return isFinite(result) ? result : null;
  if (typeof result === "string") return result;
  if (Array.isArray(result)) return result.join(", ");
  return String(result);
}

// ─── public API ───────────────────────────────────────────────────────────────

export interface EvaluationContext {
  properties: DatabaseProperty[];
  cellValues: Record<string, CellValue>;
  /** The row itself, for values stored on the page (title, created / edited
   *  time and person). Without it those come out empty. */
  page?: Page;
  /** Person id → name, so Created by / Edited by read as names. */
  personName?: (id: string) => string | undefined;
}

// Shared core. THROWS on any failure (parse error, unknown function, runtime).
// Both the swallowing evaluateFormula and the reporting validateFormula build
// on this so they evaluate identically — they only differ in how they treat a
// thrown error.
function evaluateFormulaCore(
  expression: string,
  ctx: EvaluationContext,
): string | number | boolean | null {
  if (!expression?.trim()) return null;

  const propScope: Record<string, unknown> = {};
  ctx.properties.forEach((prop, index) => {
    const raw = ctx.cellValues[prop.id] ?? null;
    propScope[propVarName(index)] = cellToFormulaValue(
      prop,
      raw,
      ctx.page,
      ctx.personName,
    );
  });
  // mathjs is downloaded on first use. Until it's in, there's no value yet;
  // components re-render once it lands (useFormulaEngineReady).
  const math = getFormulaEngine();
  if (!math) {
    void loadFormulaEngine();
    return null;
  }
  const substituted = preprocessExpression(
    substitutePropCalls(expression, ctx.properties),
  );
  const scope = { ...buildFunctionScope(), ...propScope };
  const result = math.evaluate(substituted, scope);
  return castResult(result);
}

// Evaluation for render/resolve paths: swallows errors and returns null so a
// bad formula doesn't crash the table. Behavior unchanged from before.
export function evaluateFormula(
  expression: string,
  ctx: EvaluationContext,
): string | number | boolean | null {
  try {
    return evaluateFormulaCore(expression, ctx);
  } catch (err) {
    console.error("evaluateFormula error:", err);
    return null;
  }
}

// Validation for the editor: returns null if the expression is valid, or the
// error message if it's not. This is the detector behind the error strip.
//
// IMPORTANT: this PARSES, it does not EVALUATE. Evaluating against empty (or
// any) data makes valid formulas throw runtime errors — e.g. formatDate on a
// null date — which produced false positives on formulas that actually work.
// Parsing checks structure only (parentheses, strings, tokens, call syntax)
// and never runs the functions, so well-formed formulas pass regardless of
// data, and only genuinely malformed syntax fails. This matches the intended
// scope: catching syntactical mistakes.
//
// Note: because it doesn't evaluate, this does NOT catch semantic errors like
// unknown function names or wrong argument counts — only true syntax errors.
export function validateFormula(
  expression: string,
  ctx: EvaluationContext,
): string | null {
  if (!expression?.trim()) return null; // empty is not an error
  const math = getFormulaEngine();
  if (!math) {
    void loadFormulaEngine();
    return null; // can't tell yet; the editor re-checks once it's loaded
  }
  try {
    // Mirror the transforms evaluation applies, then parse (no evaluate).
    const substituted = preprocessExpression(
      substitutePropCalls(expression, ctx.properties),
    );
    math.parse(substituted);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid formula";
  }
}
