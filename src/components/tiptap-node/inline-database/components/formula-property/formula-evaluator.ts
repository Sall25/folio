import type { FormulaPreviewResult, FormulaProperty } from "./types";

// ── Runtime for Notion-like formula functions ─────────────────────────────────

function buildContext(
  properties: FormulaProperty[],
  previewRecord?: Record<string, unknown>,
) {
  const record = previewRecord ?? {};

  // Property accessors — each prop becomes a variable in scope
  const propValues: Record<string, unknown> = {};
  for (const prop of properties) {
    const key = prop.name.replace(/\s+/g, "_");
    propValues[key] = record[prop.id] ?? sampleValue(prop.type);
  }

  // Built-in functions
  const fns = {
    // Logic
    if: (cond: boolean, a: unknown, b: unknown) => (cond ? a : b),
    and: (a: boolean, b: boolean) => a && b,
    or: (a: boolean, b: boolean) => a || b,
    not: (a: boolean) => !a,
    empty: (v: unknown) =>
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0),

    // Text
    concat: (...args: string[]) => args.join(""),
    contains: (text: string, sub: string) => text.includes(sub),
    replace: (text: string, search: string, rep: string) =>
      text.replace(search, rep),
    replaceAll: (text: string, search: string, rep: string) =>
      text.replaceAll(search, rep),
    length: (text: string) => text.length,
    slice: (text: string, start: number, end?: number) =>
      text.slice(start, end),
    split: (text: string, sep: string) => text.split(sep),
    lower: (text: string) => text.toLowerCase(),
    upper: (text: string) => text.toUpperCase(),
    trim: (text: string) => text.trim(),
    test: (text: string, pattern: string) => new RegExp(pattern).test(text),
    format: (v: unknown) => String(v),

    // Number
    abs: (n: number) => Math.abs(n),
    ceil: (n: number) => Math.ceil(n),
    floor: (n: number) => Math.floor(n),
    round: (n: number) => Math.round(n),
    max: (...args: number[]) => Math.max(...args),
    min: (...args: number[]) => Math.min(...args),
    sqrt: (n: number) => Math.sqrt(n),
    pow: (base: number, exp: number) => Math.pow(base, exp),
    log: (n: number, base = Math.E) => Math.log(n) / Math.log(base),
    mod: (a: number, b: number) => a % b,
    toNumber: (v: unknown) => Number(v),

    // Date
    now: () => new Date(),
    today: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    },
    dateAdd: (d: Date, n: number, unit: string) => {
      const r = new Date(d);
      const u = unit.toLowerCase();
      if (u === "days" || u === "day") r.setDate(r.getDate() + n);
      if (u === "hours" || u === "hour") r.setHours(r.getHours() + n);
      if (u === "minutes" || u === "minute") r.setMinutes(r.getMinutes() + n);
      if (u === "months" || u === "month") r.setMonth(r.getMonth() + n);
      if (u === "years" || u === "year") r.setFullYear(r.getFullYear() + n);
      return r;
    },
    dateBetween: (a: Date, b: Date, unit: string) => {
      const ms = Math.abs(a.getTime() - b.getTime());
      const u = unit.toLowerCase();
      if (u === "days" || u === "day") return Math.floor(ms / 86400000);
      if (u === "hours" || u === "hour") return Math.floor(ms / 3600000);
      if (u === "minutes" || u === "minute") return Math.floor(ms / 60000);
      if (u === "months" || u === "month") return Math.floor(ms / 2628000000);
      if (u === "years" || u === "year") return Math.floor(ms / 31536000000);
      return ms;
    },
    year: (d: Date) => d.getFullYear(),
    month: (d: Date) => d.getMonth(),
    day: (d: Date) => d.getDay(),
    date: (d: Date) => d.getDate(),
    hour: (d: Date) => d.getHours(),
    minute: (d: Date) => d.getMinutes(),
    timestamp: (d: Date) => d.getTime(),
    fromTimestamp: (ms: number) => new Date(ms),

    // Array
    at: (arr: unknown[], i: number) => arr.at(i),
    first: (arr: unknown[]) => arr[0],
    last: (arr: unknown[]) => arr[arr.length - 1],
    sort: (arr: unknown[]) => [...arr].sort(),
    reverse: (arr: unknown[]) => [...arr].reverse(),
    join: (arr: unknown[], sep: string) => arr.join(sep),
    includes: (arr: unknown[], v: unknown) => arr.includes(v),
    filter: (arr: unknown[], fn: (v: unknown) => boolean) => arr.filter(fn),
    map: (arr: unknown[], fn: (v: unknown) => unknown) => arr.map(fn),
    count: (arr: unknown[]) => arr.length,
  };

  return { ...fns, ...propValues };
}

function sampleValue(type: string): unknown {
  switch (type) {
    case "text":
      return "Sample text";
    case "number":
      return 42;
    case "checkbox":
      return true;
    case "date":
      return new Date();
    case "created_time":
    case "edited_time":
      return new Date();
    case "person":
    case "created_by":
    case "edited_by":
      return "John Doe";
    default:
      return "";
  }
}

function inferType(value: unknown): string {
  if (value === null || value === undefined) return "unknown";
  if (typeof value === "boolean") return "checkbox";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "text";
  if (Array.isArray(value)) return "list";
  if (value instanceof Date) return "date";
  return "unknown";
}

function formatOutput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

export function evaluateFormula(
  formula: string,
  properties: FormulaProperty[],
  previewRecord?: Record<string, unknown>,
): FormulaPreviewResult {
  const trimmed = formula.trim();
  if (!trimmed) return { output: null, type: "unknown", error: null };

  try {
    const ctx = buildContext(properties, previewRecord);
    const args = Object.keys(ctx);
    const vals = Object.values(ctx);

    // eslint-disable-next-line no-new-func
    const fn = new Function(...args, `"use strict"; return (${trimmed});`);
    const result = fn(...vals);

    return {
      output: formatOutput(result),
      type: inferType(result),
      error: null,
    };
  } catch (err) {
    return {
      output: null,
      type: "unknown",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
