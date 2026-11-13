import { join } from "node:path";
import * as sass from "sass";

// Reading stylesheets the way a browser does, for tests about what a thing
// actually looks like.
//
// Some of this app's looks are decided by several stylesheets at once, and
// the bugs that follow are invisible to an ordinary unit test: a rule in one
// file cancels a rule in another (same weight, later in the file wins), or a
// table-wide rule stretches something that then paints over its neighbour.
// So: compile the stylesheets a part of the app uses, model the element as a
// chain from its outermost ancestor down, and ask which declaration wins.

export interface El {
  classes: string[];
  attrs: Record<string, string>;
  /** Direct children, for :has(> …). */
  children: El[];
}

/** An element: "div.db-cell.db-cell-board-view", attributes, its children. */
export function el(
  selector: string,
  attrs: Record<string, string> = {},
  children: El[] = [],
): El {
  return {
    classes: selector.split(/\s+/).filter(Boolean),
    attrs,
    children,
  };
}

export interface Rule {
  selector: string;
  decls: Record<string, { value: string; important: boolean }>;
  order: number;
}

/** Compile these stylesheets (paths under src/) into one list of rules. */
export function loadStylesheets(src: string, sheets: string[]): Rule[] {
  const css = sheets
    .map(
      (sheet) =>
        sass.compile(join(src, sheet), {
          loadPaths: [src],
          silenceDeprecations: ["import", "global-builtin"],
          quietDeps: true,
        }).css,
    )
    .join("\n");

  const rules: Rule[] = [];
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const selectors = m[1].trim();
    if (selectors.startsWith("@")) continue;
    const decls: Rule["decls"] = {};
    for (const part of m[2].split(";")) {
      const i = part.indexOf(":");
      if (i < 0) continue;
      const name = part.slice(0, i).trim();
      let value = part.slice(i + 1).trim();
      const important = /!important$/.test(value);
      if (important) value = value.replace(/!important$/, "").trim();
      if (!name) continue;
      decls[name] = { value, important };
      for (const [long, v] of expand(name, value))
        decls[long] = { value: v, important };
    }
    // ":is(a, b)" keeps its commas; only split the list's own commas.
    for (const selector of splitSelectors(selectors))
      rules.push({ selector, decls, order: rules.length });
  }
  return rules;
}

/** A shorthand sets its longhands too, or a `margin: 0` in another file
 *  looks like no margin rule at all. */
function expand(name: string, value: string): [string, string][] {
  if (name === "margin" || name === "padding") {
    const v = value.split(/\s+/);
    const [top, right = top, bottom = top, left = right] = v;
    return [
      [`${name}-top`, top],
      [`${name}-right`, right],
      [`${name}-bottom`, bottom],
      [`${name}-left`, left],
    ];
  }
  if (name === "background" && !value.includes("url(")) {
    return [["background-color", value]];
  }
  if (/^border(-(top|right|bottom|left))?$/.test(name)) {
    const [width = "", style = "", ...rest] = value.split(/\s+/);
    const color = rest.join(" ");
    const sides = name === "border" ? ["top", "right", "bottom", "left"] : [];
    const out: [string, string][] = [];
    if (sides.length === 0) {
      out.push([`${name}-width`, width], [`${name}-style`, style]);
      if (color) out.push([`${name}-color`, color]);
    } else {
      for (const side of sides) {
        out.push([`border-${side}-width`, width]);
        out.push([`border-${side}-style`, style]);
        if (color) out.push([`border-${side}-color`, color]);
      }
    }
    return out;
  }
  return [];
}

function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of list) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** A selector into its compounds and combinators, leaving the spaces
 *  inside :is(), :not(), :has() and [attr] alone. */
function splitCompounds(selector: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  const push = () => {
    if (current.trim()) out.push(current.trim());
    current = "";
  };
  for (const ch of selector.trim()) {
    if (ch === "(" || ch === "[") depth += 1;
    if (ch === ")" || ch === "]") depth -= 1;
    if (depth === 0 && /\s/.test(ch)) {
      push();
      continue;
    }
    if (depth === 0 && ch === ">") {
      push();
      out.push(">");
      continue;
    }
    current += ch;
  }
  push();
  return out;
}

/** One compound (".a.b[c=d]:is(…):has(> …)") against one element. */
export function matchesCompound(compound: string, node: El): boolean {
  if (compound === "*" || compound === "") return true;
  const parts =
    compound.match(
      /:(?:is|not|has)\((?:[^()]|\([^()]*\))*\)|\.[\w-]+|\[[^\]]+\]|[\w-]+/g,
    ) ?? [];
  if (parts.length === 0) return false;
  for (const part of parts) {
    if (part.startsWith(".")) {
      if (!node.classes.includes(part.slice(1))) return false;
    } else if (part.startsWith("[")) {
      const [, name, , value] =
        /\[([\w-]+)(=(?:"([^"]*)"|([^\]]*)))?\]/.exec(part) ?? [];
      if (!name || !(name in node.attrs)) return false;
      if (value !== undefined && node.attrs[name] !== value) return false;
    } else if (part.startsWith(":is(")) {
      const any = splitSelectors(part.slice(4, -1)).some((inner) =>
        matchesCompound(inner.trim(), node),
      );
      if (!any) return false;
    } else if (part.startsWith(":not(")) {
      const any = splitSelectors(part.slice(5, -1)).some((inner) =>
        matchesCompound(inner.trim(), node),
      );
      if (any) return false;
    } else if (part.startsWith(":has(")) {
      // Only the direct-child form, which is what these tests need.
      const inner = part.slice(5, -1).trim();
      if (!inner.startsWith(">")) return false;
      const wanted = inner.slice(1).trim();
      if (!node.children.some((c) => matchesCompound(wanted, c))) return false;
    } else if (/^[a-z]/i.test(part)) {
      if (!node.classes.includes(`tag:${part}`)) return false;
    }
  }
  return true;
}

/** A selector against a chain (outermost ancestor first, element last). */
export function matches(selector: string, chain: El[]): boolean {
  if (/::|:hover|:focus|:active/.test(selector)) return false;
  const tokens = splitCompounds(selector);
  let i = tokens.length - 1;
  let node = chain.length - 1;
  let child = false;
  let matched = false;
  while (i >= 0) {
    const token = tokens[i];
    if (token === ">") {
      child = true;
      i -= 1;
      continue;
    }
    if (!matched) {
      if (!matchesCompound(token, chain[node])) return false;
      matched = true;
      node -= 1;
      i -= 1;
      continue;
    }
    if (child) {
      if (node < 0 || !matchesCompound(token, chain[node])) return false;
      node -= 1;
      child = false;
    } else {
      let found = false;
      while (node >= 0) {
        if (matchesCompound(token, chain[node])) {
          node -= 1;
          found = true;
          break;
        }
        node -= 1;
      }
      if (!found) return false;
    }
    i -= 1;
  }
  return true;
}

export function weight(selector: string): number {
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?!\()/g) ?? [])
    .length;
  const tags = (selector.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return classes * 10 + tags;
}

/** What the browser would use for `property` on the chain's last element. */
export function resolve(
  rules: Rule[],
  chain: El[],
  property: string,
): { value: string; selector: string } | null {
  let best: { rule: Rule; score: number; important: boolean } | null = null;
  for (const rule of rules) {
    const decl = rule.decls[property];
    if (!decl || !matches(rule.selector, chain)) continue;
    const score = weight(rule.selector);
    if (
      !best ||
      (decl.important && !best.important) ||
      (decl.important === best.important && score >= best.score)
    ) {
      best = { rule, score, important: decl.important };
    }
  }
  return best
    ? { value: best.rule.decls[property].value, selector: best.rule.selector }
    : null;
}
