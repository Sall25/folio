import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as sass from "sass";

// What a card looks like is CSS, and CSS went wrong here in ways no unit
// test would normally catch: a rule in one file zeroed the title's margin
// while the properties kept theirs (6px out of line), a rule of mine
// cancelled another of mine (same weight, later in the file), and cells
// that build their own element kept the table's 34px row inside a card.
//
// So this works the way the browser does: compile the stylesheets a card
// uses, then for a given element work out which declaration actually wins,
// by weight and then by order. The assertions are the things that must stay
// true for a card to read as one column of rows.

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../..");

// Every stylesheet that has a say in a card's boxes. A new one that styles
// cards belongs here too.
const SHEETS = [
  "features/database/components/cells/cell/cell.scss",
  "features/database/primitives/title-cell-display.scss",
  "features/database/primitives/person-cell-display.scss",
  "features/database/primitives/select-cell-display.scss",
  "features/database/primitives/status-cell-display.scss",
  "features/database/primitives/number-cell-display.scss",
  "features/database/primitives/checkbox-cell-display.scss",
  "features/database/primitives/cell-editor-popover.scss",
  "features/database/nodes/database-board-node-view/database-board-node-view.scss",
  "features/database/nodes/database-gallery-node-view/database-gallery-node-view.scss",
  "features/database/primitives/board-card-body.scss",
];

// ── The page: every rule, in order ────────────────────────────────────────

interface Rule {
  selector: string;
  decls: Record<string, { value: string; important: boolean }>;
  order: number;
}

function stylesheet(): Rule[] {
  const css = SHEETS.map(
    (s) =>
      sass.compile(join(src, s), {
        loadPaths: [src],
        silenceDeprecations: ["import", "global-builtin"],
        quietDeps: true,
      }).css,
  ).join("\n");

  const rules: Rule[] = [];
  // Compiled CSS is flat: `selectors { declarations }`, no nesting left.
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
      // A shorthand sets the longhands too, or a `margin: 0` elsewhere
      // would look like no margin rule at all here.
      if (name === "margin" || name === "padding") {
        const v = value.split(/\s+/);
        const [top, right = top, bottom = top, left = right] = v;
        decls[`${name}-top`] = { value: top, important };
        decls[`${name}-right`] = { value: right, important };
        decls[`${name}-bottom`] = { value: bottom, important };
        decls[`${name}-left`] = { value: left, important };
      }
    }
    for (const selector of selectors.split(","))
      rules.push({ selector: selector.trim(), decls, order: rules.length });
  }
  return rules;
}

// ── The element: a chain from the card down ───────────────────────────────

interface El {
  classes: string[];
  attrs: Record<string, string>;
}

const el = (classes: string, attrs: Record<string, string> = {}): El => ({
  classes: classes.split(/\s+/).filter(Boolean),
  attrs,
});

/** One compound (".a.b[c=d]") against one element. */
function matchesCompound(compound: string, node: El): boolean {
  if (compound === "*" || compound === "") return true;
  const parts = compound.match(/\.[\w-]+|\[[^\]]+\]|:not\([^)]*\)|[\w-]+/g);
  if (!parts) return false;
  for (const part of parts) {
    if (part.startsWith(".")) {
      if (!node.classes.includes(part.slice(1))) return false;
    } else if (part.startsWith("[")) {
      const [, name, , value] =
        /\[([\w-]+)(=(?:"([^"]*)"|([^\]]*)))?\]/.exec(part) ?? [];
      if (!name || !(name in node.attrs)) return false;
      if (value !== undefined && node.attrs[name] !== value) return false;
    } else if (part.startsWith(":not(")) {
      const inner = part.slice(5, -1);
      if (matchesCompound(inner, node)) return false;
    } else if (/^[a-z]/i.test(part)) {
      // A tag name: every element here is a div or a button, named below.
      if (!node.classes.includes(`tag:${part}`)) return false;
    }
  }
  return true;
}

/** A selector against a chain (ancestors first, the element last). */
function matches(selector: string, chain: El[]): boolean {
  if (/[:][:]|:hover|:focus|:active|:has\(/.test(selector)) return false;
  const tokens = selector.trim().split(/\s+(?![^[]*\])/);
  // Walk right to left: the rightmost compound must match the element.
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

function weight(selector: string): number {
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?!\()/g) ?? [])
    .length;
  const tags = (selector.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return classes * 10 + tags;
}

/** What the browser would use for `property` on the chain's last element. */
function resolve(
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

// ── The card ──────────────────────────────────────────────────────────────

const card = el("db-board-card tag:div", { "data-view-type": "gallery" });
const title = el("db-board-card__title tag:div");
const props = el("db-board-card__props tag:div", { "data-layout": "list" });
/** A property row: most cells carry the card class… */
const row = el("db-cell db-cell-board-view tag:div");
/** …and a few (multi-select, formula, email, the time ones) don't. */
const plainRow = el("db-cell tag:div", { "data-wrap": "true" });

const titleChain = [card, title];
const propsChain = [card, props];
const rowChain = [card, props, row];
const plainRowChain = [card, props, plainRow];

describe("gallery card layout", () => {
  const rules = stylesheet();
  const get = (chain: El[], property: string) =>
    resolve(rules, chain, property)?.value ?? null;

  it("gives the title and the properties the same left inset", () => {
    // What went wrong: one of them had its margin zeroed and the other
    // kept 6px, so every property sat 6px right of the title.
    expect(get(titleChain, "padding-left")).toBe(get(propsChain, "padding-left"));
    expect(get(titleChain, "margin-left")).toBe(get(propsChain, "margin-left"));
    expect(get(titleChain, "margin-left")).toBe("0");
    expect(get(titleChain, "padding-left")).toBe("var(--db-card-gutter)");
  });

  it("keeps that inset against the board grid's rule", () => {
    // The board's stylesheet zeroes the properties' padding for every card
    // in its grid, and the gallery uses the same grid class.
    const winner = resolve(rules, propsChain, "padding-left");
    expect(winner?.value).not.toBe("0");
  });

  it("gives every row the same height", () => {
    // A rule of mine once cancelled this one: same weight, later in the
    // file, so the rows fell back to their content's height.
    expect(get(rowChain, "min-height")).toBe("24px");
    expect(get(plainRowChain, "min-height")).toBe("24px");
  });

  it("never lets a cell keep the table's row inside a card", () => {
    expect(get(rowChain, "line-height")).toBe("1.4");
    expect(get(plainRowChain, "line-height")).toBe("1.4");
    expect(get(plainRowChain, "height")).toBe("fit-content");
  });

  it("drops the padding a wrapping cell keeps for the table", () => {
    // 6px top and bottom on that one property, which read as a gap.
    expect(get(plainRowChain, "padding-top")).toBe("0");
    expect(get(plainRowChain, "padding-bottom")).toBe("0");
  });

  it("starts every row at the card's gutter, not the cell's inset", () => {
    expect(get(rowChain, "padding-left")).toBe("0");
    expect(get(rowChain, "margin-left")).toBe("0");
  });
});
