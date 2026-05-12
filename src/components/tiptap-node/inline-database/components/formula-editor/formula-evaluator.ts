/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create, all } from "mathjs";
import type {
  DatabaseProperty,
  CellValue,
  PropertyType,
  CellValueMap,
} from "../../types/types";

// ─── mathjs instance ──────────────────────────────────────────────────────────

const math = create(all);

// Override equal/unequal to use strict JS equality so strings work correctly
math.import(
  {
    equal: (a: unknown, b: unknown) => a === b,
    unequal: (a: unknown, b: unknown) => a !== b,
    smaller: (a: unknown, b: unknown) => (a as number) < (b as number),
    larger: (a: unknown, b: unknown) => (a as number) > (b as number),
    smallerEq: (a: unknown, b: unknown) => (a as number) <= (b as number),
    largerEq: (a: unknown, b: unknown) => (a as number) >= (b as number),
  },
  { override: true },
);

// ─── expression pre-processing ────────────────────────────────────────────────

// Rename Notion functions that clash with JS/mathjs reserved words
const RESERVED_RENAMES: [RegExp, string][] = [
  [/\bif\b/g, "_if"],
  [/\blet\b/g, "_let"],
  [/\blets\b/g, "_lets"],
  [/\band\b/g, "_and"],
  [/\bor\b/g, "_or"],
  [/\bnot\b/g, "_not"],
];

function preprocessExpression(expression: string): string {
  let result = expression;
  for (const [pattern, replacement] of RESERVED_RENAMES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// prop("Name") → __prop_Name__
function sanitizePropName(name: string): string {
  return `__prop_${name.replace(/[^a-zA-Z0-9_]/g, "_")}__`;
}

function substitutePropCalls(expression: string): string {
  return expression.replace(/prop\(["']([^"']+)["']\)/g, (_, name) =>
    sanitizePropName(name),
  );
}

// ─── cell value → formula value ───────────────────────────────────────────────

function cellToFormulaValue(
  type: PropertyType,
  value: CellValue,
): string | number | boolean | null {
  if (value === null || value === undefined) return null;

  switch (type) {
    case "title":
    case "text":
    case "url":
    case "email":
    case "phone":
      return value as string;

    case "number":
      return (value as number) ?? null;

    case "checkbox":
      return value as boolean;

    case "select":
    case "status": {
      const v = value as CellValueMap["select"];
      return v?.label ?? null;
    }

    case "multi_select": {
      const v = value as CellValueMap["multi_select"];
      return v?.map((o) => o.label).join(", ") ?? "";
    }

    case "date":
    case "created_time":
    case "edited_time":
      return value as string;

    default:
      return null;
  }
}

// ─── Notion built-in function scope ───────────────────────────────────────────

function buildFunctionScope(): Record<string, unknown> {
  function parseAnyDate(v: unknown): Date {
    if (typeof v === "string") return new Date(v);
    if (v instanceof Date) return v;
    throw new Error(`Cannot parse date from ${v}`);
  }

  return {
    // ── Logic (renamed to avoid reserved word conflicts) ───────────────────
    _if: (cond: boolean, a: unknown, b: unknown) => (cond ? a : b),
    _and: (a: unknown, b: unknown) => Boolean(a) && Boolean(b),
    _or: (a: unknown, b: unknown) => Boolean(a) || Boolean(b),
    _not: (a: unknown) => !a,
    _let: (_name: unknown, _val: unknown, expr: unknown) => expr,
    _lets: (...args: unknown[]) => args[args.length - 1],

    ifs: (...args: unknown[]) => {
      for (let i = 0; i + 1 < args.length; i += 2) {
        if (args[i]) return args[i + 1];
      }
      if (args.length % 2 !== 0) return args[args.length - 1];
      return null;
    },
    empty: (v: unknown) =>
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0) ||
      v === 0,

    // ── Text ───────────────────────────────────────────────────────────────
    length: (v: string | unknown[]) => (v as any).length,
    substring: (s: string, start: number, end?: number) =>
      s.substring(start, end),
    contains: (s: string, search: string) => s.includes(search),
    test: (s: string, regex: string) => new RegExp(regex).test(s),
    match: (s: string, regex: string) => s.match(new RegExp(regex, "g")) ?? [],
    replace: (s: string, regex: string, rep: string) =>
      s.replace(new RegExp(regex), rep),
    replaceAll: (s: string, regex: string, rep: string) =>
      s.replaceAll(new RegExp(regex, "g"), rep),
    lower: (s: string) => s.toLowerCase(),
    upper: (s: string) => s.toUpperCase(),
    repeat: (s: string, n: number) => s.repeat(n),
    link: (label: string, url: string) => `[${label}](${url})`,
    style: (s: string, ..._styles: string[]) => s,
    unstyle: (s: string) => s,
    format: (v: unknown) => String(v),
    trim: (s: string) => s.trim(),
    toNumber: (v: unknown) => Number(v),

    // ── Date ───────────────────────────────────────────────────────────────
    now: () => new Date().toISOString(),
    today: () => new Date().toISOString().slice(0, 10),
    parseDate: (s: string) => new Date(s).toISOString(),
    timestamp: (d: unknown) => parseAnyDate(d).getTime(),
    fromTimestamp: (ms: number) => new Date(ms).toISOString(),
    formatDate: (d: unknown, fmt: string) => {
      const date = parseAnyDate(d);
      const weekNum = (() => {
        const start = new Date(date.getFullYear(), 0, 1);
        return Math.ceil(
          ((date.getTime() - start.getTime()) / 86_400_000 +
            start.getDay() +
            1) /
            7,
        );
      })();

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
    },
    // formatDate: (d: unknown, fmt: string) => {
    //   const date = parseAnyDate(d);
    //   const weekNum = (() => {
    //     const start = new Date(date.getFullYear(), 0, 1);
    //     return Math.ceil(
    //       ((date.getTime() - start.getTime()) / 86_400_000 +
    //         start.getDay() +
    //         1) /
    //         7,
    //     );
    //   })();

    //   // Order matters — longer tokens first to avoid partial matches
    //   return fmt
    //     .replace("MMMM", date.toLocaleString("en", { month: "long" }))
    //     .replace("MMM", date.toLocaleString("en", { month: "short" }))
    //     .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
    //     .replace("YYYY", String(date.getFullYear()))
    //     .replace("YY", String(date.getFullYear()).slice(-2))
    //     .replace("DD", String(date.getDate()).padStart(2, "0"))
    //     .replace("D", String(date.getDate()))
    //     .replace("ddd", date.toLocaleString("en", { weekday: "short" }))
    //     .replace("dddd", date.toLocaleString("en", { weekday: "long" }))
    //     .replace("HH", String(date.getHours()).padStart(2, "0"))
    //     .replace("h", String(date.getHours()))
    //     .replace("mm", String(date.getMinutes()).padStart(2, "0"))
    //     .replace("ss", String(date.getSeconds()).padStart(2, "0"))
    //     .replace("A", date.getHours() >= 12 ? "PM" : "AM")
    //     .replace("w", String(weekNum));
    // },
    dateBetween: (a: unknown, b: unknown, unit: string) => {
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
    dateAdd: (d: unknown, n: number, unit: string) => {
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
    },
    dateSubtract: (d: unknown, n: number, unit: string) => {
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
    },
    minute: (d: unknown) => parseAnyDate(d).getMinutes(),
    hour: (d: unknown) => parseAnyDate(d).getHours(),
    day: (d: unknown) => parseAnyDate(d).getDay() || 7,
    date: (d: unknown) => parseAnyDate(d).getDate(),
    month: (d: unknown) => parseAnyDate(d).getMonth() + 1,
    year: (d: unknown) => parseAnyDate(d).getFullYear(),
    week: (d: unknown) => {
      const date = parseAnyDate(d);
      const start = new Date(date.getFullYear(), 0, 1);
      return Math.ceil(
        ((date.getTime() - start.getTime()) / 86_400_000 + start.getDay() + 1) /
          7,
      );
    },

    // ── List ───────────────────────────────────────────────────────────────
    at: (list: unknown[], i: number) => list[i],
    first: (list: unknown[]) => list[0],
    last: (list: unknown[]) => list[list.length - 1],
    slice: (list: unknown[], s: number, e?: number) => list.slice(s, e),
    concat: (...lists: unknown[][]) => ([] as unknown[]).concat(...lists),
    sort: (list: unknown[]) => [...list].sort(),
    reverse: (list: unknown[]) => [...list].reverse(),
    join: (list: unknown[], sep: string) => list.join(sep),
    split: (s: string, sep: string) => s.split(sep),
    unique: (list: unknown[]) => [...new Set(list)],
    includes: (list: unknown[], v: unknown) => list.includes(v),
    flat: (list: unknown[][]) => list.flat(),
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
}

export function evaluateFormula(
  expression: string,
  ctx: EvaluationContext,
): string | number | boolean | null {
  if (!expression.trim()) return null;

  try {
    const propScope: Record<string, unknown> = {};
    for (const prop of ctx.properties) {
      const varName = sanitizePropName(prop.name);
      const raw = ctx.cellValues[prop.id] ?? null;
      propScope[varName] = cellToFormulaValue(prop.config.type, raw);
    }

    const substituted = preprocessExpression(substitutePropCalls(expression));
    const scope = { ...buildFunctionScope(), ...propScope };
    const result = math.evaluate(substituted, scope);
    return castResult(result);
  } catch (err) {
    console.error("evaluateFormula error:", err);
    return null;
  }
}
