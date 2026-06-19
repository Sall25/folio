import type {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import type { DatabaseProperty } from "src/types";
import { FORMULA_FUNCTIONS } from "./formula-language";

// Function signatures shown as detail in the autocomplete popup
const FUNCTION_SIGNATURES: Record<string, string> = {
  if: "if(condition, trueValue, falseValue)",
  ifs: "ifs(condition, value, ...)",
  empty: "empty(value)",
  length: "length(text | list)",
  substring: "substring(text, start, end?)",
  contains: "contains(text, search)",
  test: "test(text, regex)",
  match: "match(text, regex)",
  replace: "replace(text, regex, replacement)",
  replaceAll: "replaceAll(text, regex, replacement)",
  lower: "lower(text)",
  upper: "upper(text)",
  repeat: "repeat(text, n)",
  link: "link(label, url)",
  style: 'style(text, "b" | "i" | "u" | "s" | "c" | color)',
  unstyle: "unstyle(text, style?)",
  format: "format(value)",
  formatDate: 'formatDate(date, "MMMM D, YYYY")',
  formatNumber: 'formatNumber(number, "usd", decimals)',
  parseDate: 'parseDate("2024-01-01")',
  add: "add(a, b)",
  subtract: "subtract(a, b)",
  multiply: "multiply(a, b)",
  divide: "divide(a, b)",
  mod: "mod(a, b)",
  pow: "pow(base, exponent)",
  min: "min(a, b, ...)",
  max: "max(a, b, ...)",
  sum: "sum(a, b, ...)",
  median: "median(a, b, ...)",
  mean: "mean(a, b, ...)",
  abs: "abs(number)",
  round: "round(number, decimals?)",
  ceil: "ceil(number)",
  floor: "floor(number)",
  sqrt: "sqrt(number)",
  cbrt: "cbrt(number)",
  exp: "exp(number)",
  ln: "ln(number)",
  log10: "log10(number)",
  log2: "log2(number)",
  sign: "sign(number)",
  pi: "pi()",
  e: "e()",
  toNumber: "toNumber(value)",
  now: "now()",
  today: "today()",
  timestamp: "timestamp(date)",
  fromTimestamp: "fromTimestamp(ms)",
  minute: "minute(date)",
  hour: "hour(date)",
  day: "day(date)",
  date: "date(date)",
  week: "week(date)",
  month: "month(date)",
  year: "year(date)",
  dateAdd: 'dateAdd(date, n, "days" | "months" | "years" | ...)',
  dateSubtract: 'dateSubtract(date, n, "days" | "months" | "years" | ...)',
  dateBetween: 'dateBetween(date1, date2, "days" | "months" | ...)',
  dateRange: "dateRange(start, end)",
  dateStart: "dateStart(dateRange)",
  dateEnd: "dateEnd(dateRange)",
  name: "name(person)",
  email: "email(person)",
  id: "id(page?)",
  at: "at(list, index)",
  first: "first(list)",
  last: "last(list)",
  slice: "slice(list, start, end?)",
  concat: "concat(list, list, ...)",
  sort: "sort(list)",
  reverse: "reverse(list)",
  join: "join(list, separator)",
  split: 'split(text, ",")',
  unique: "unique(list)",
  includes: "includes(list, value)",
  find: "find(list, condition)",
  findIndex: "findIndex(list, condition)",
  filter: "filter(list, condition)",
  some: "some(list, condition)",
  every: "every(list, condition)",
  map: "map(list, expression)",
  flat: "flat(list)",
  equal: "equal(a, b)",
  unequal: "unequal(a, b)",
  let: "let(name, value, expression)",
  lets: "lets(name, value, ..., expression)",
  trim: "trim(text)",
};

export function formulaCompletions(properties: DatabaseProperty[]) {
  return (context: CompletionContext): CompletionResult | null => {
    // prop("...") — property name completions
    const propMatch = context.matchBefore(/prop\(["'][^"']*$/);
    if (propMatch) {
      const quoteChar = propMatch.text.includes('"') ? '"' : "'";
      return {
        from: propMatch.from + propMatch.text.indexOf(quoteChar) + 1,
        options: properties.map((prop) => ({
          label: prop.name,
          apply: `${prop.name}${quoteChar})`,
          type: "property",
          detail: prop.config.type,
        })),
        validFor: /^[^"']*/,
      };
    }

    // Function / keyword completions
    const word = context.matchBefore(/[a-zA-Z_][a-zA-Z0-9_]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    return {
      from: word.from,
      options: FORMULA_FUNCTIONS.map((fn) => ({
        label: fn,
        apply: `${fn}(`,
        type: "function",
        detail: FUNCTION_SIGNATURES[fn] ?? fn,
      })),
      validFor: /^[a-zA-Z_][a-zA-Z0-9_]*/,
    };
  };
}
