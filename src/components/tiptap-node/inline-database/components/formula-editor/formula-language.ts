import { StreamLanguage, LanguageSupport } from "@codemirror/language";

// All built-in Notion formula functions
export const FORMULA_FUNCTIONS = [
  "if",
  "ifs",
  "empty",
  "length",
  "substring",
  "contains",
  "test",
  "match",
  "replace",
  "replaceAll",
  "lower",
  "upper",
  "repeat",
  "link",
  "style",
  "unstyle",
  "format",
  "formatDate",
  "formatNumber",
  "parseDate",
  "add",
  "subtract",
  "multiply",
  "divide",
  "mod",
  "pow",
  "min",
  "max",
  "sum",
  "median",
  "mean",
  "abs",
  "round",
  "ceil",
  "floor",
  "sqrt",
  "cbrt",
  "exp",
  "ln",
  "log10",
  "log2",
  "sign",
  "pi",
  "e",
  "toNumber",
  "now",
  "today",
  "timestamp",
  "fromTimestamp",
  "minute",
  "hour",
  "day",
  "date",
  "week",
  "month",
  "year",
  "dateAdd",
  "dateSubtract",
  "dateBetween",
  "dateRange",
  "dateStart",
  "dateEnd",
  "name",
  "email",
  "id",
  "at",
  "first",
  "last",
  "slice",
  "concat",
  "sort",
  "reverse",
  "join",
  "split",
  "unique",
  "includes",
  "find",
  "findIndex",
  "filter",
  "some",
  "every",
  "map",
  "flat",
  "equal",
  "unequal",
  "let",
  "lets",
  "trim",
];

const FUNCTION_SET = new Set(FORMULA_FUNCTIONS);

const KEYWORDS = new Set([
  "true",
  "false",
  "and",
  "or",
  "not",
  "current",
  "index",
]);

const formulaStreamLanguage = StreamLanguage.define<{
  inString: boolean;
  quote: string;
}>({
  name: "formula",

  startState: () => ({ inString: false, quote: "" }),

  token(stream, state) {
    // Inside a string
    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") {
          stream.next(); // skip escaped char
        } else if (ch === state.quote) {
          state.inString = false;
          state.quote = "";
          break;
        }
      }
      return "string";
    }

    // Skip whitespace
    if (stream.eatSpace()) return null;

    const ch = stream.peek();

    // String start
    if (ch === '"' || ch === "'") {
      state.inString = true;
      state.quote = ch!;
      stream.next();
      return "string";
    }

    // Numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) return "number";

    // Operators
    if (stream.match(/^(==|!=|>=|<=|>|<|\+|-|\*|\/|\^|%|\?|:)/))
      return "operator";

    // prop() — highlight as a keyword
    if (stream.match(/^prop\b/)) return "keyword";

    // Identifiers — check if function or keyword
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const w = stream.current();
      if (FUNCTION_SET.has(w)) return "function";
      if (KEYWORDS.has(w)) return "keyword";
      return "variableName";
    }

    // Punctuation
    if (stream.match(/^[(),.[\]]/)) return "punctuation";

    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "//" },
  },
});

export const formulaLanguage = new LanguageSupport(formulaStreamLanguage);
