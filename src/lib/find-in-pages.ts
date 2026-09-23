import type { JSONContent } from "@tiptap/core";
import type {  Page } from "src/types";

// Pure, synchronous full-text search over page content JSON. No React, no
// network: takes pages + a query, returns matches grouped by page. Kept as a
// plain function so it can later be swapped for a server-side (Postgres FTS)
// implementation returning the same shape.

export interface FindOptions {
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface FindMatch {
  /** Stable id of the nearest block carrying one (for scroll-to), if any. */
  blockId: string | null;
  /** Position of the block in the doc's reading order (fallback anchor). */
  blockIndex: number;
  /** Text shown in the results list — a window around the matches. */
  snippet: string;
  /** [start, end) ranges inside `snippet` to highlight. */
  ranges: [number, number][];
  /** How many occurrences this block contains (may exceed ranges shown). */
  count: number;
}

export interface FindPageResult {
  page: Page;
  matches: FindMatch[];
  /** Total occurrences across the page. */
  total: number;
}

export interface FindResult {
  pages: FindPageResult[];
  totalMatches: number;
  /** True when the result cap was hit and the list is incomplete. */
  truncated: boolean;
  /** Set when regex mode is on and the pattern doesn't compile. */
  error: string | null;
}

const EMPTY_RESULT: FindResult = {
  pages: [],
  totalMatches: 0,
  truncated: false,
  error: null,
};

// Safety cap so a one-letter query over a big workspace can't lock the UI.
const MAX_MATCHES = 2000;
const SNIPPET_BEFORE = 40;
const SNIPPET_MAX = 160;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word boundaries that understand accented letters (French!) — \b
// treats "é" as a non-word character, so "café" would match inside "cafés".
const WORD_BEFORE = "(?<![\\p{L}\\p{N}_])";
const WORD_AFTER = "(?![\\p{L}\\p{N}_])";

export function buildMatcher(
  query: string,
  opts: FindOptions,
): { re: RegExp | null; error: string | null } {
  if (!query) return { re: null, error: null };
  const source = opts.regex ? query : escapeRegExp(query);
  const wrapped = opts.wholeWord
    ? `${WORD_BEFORE}(?:${source})${WORD_AFTER}`
    : source;
  try {
    return {
      re: new RegExp(wrapped, `gu${opts.matchCase ? "" : "i"}`),
      error: null,
    };
  } catch (e) {
    return {
      re: null,
      error: e instanceof Error ? e.message : "Invalid pattern",
    };
  }
}

interface Block {
  text: string;
  id: string | null;
}

function inlineText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  return (node.content ?? []).map(inlineText).join("");
}

function hasInlineChildren(node: JSONContent): boolean {
  return (node.content ?? []).some(
    (c) => c.type === "text" || c.type === "hardBreak",
  );
}

// Flatten a doc into its text blocks (paragraphs, headings, code, title...),
// in reading order. Container nodes (lists, quotes, columns, callouts) are
// walked through. Each block remembers the nearest ancestor-or-self id, so a
// paragraph inside an id'd list item still has something to scroll to.
function collectBlocks(doc: JSONContent | undefined): Block[] {
  const blocks: Block[] = [];
  const walk = (node: JSONContent, inheritedId: string | null) => {
    const ownId =
      typeof node.attrs?.id === "string" ? (node.attrs.id as string) : null;
    const id = ownId ?? inheritedId;
    if (hasInlineChildren(node)) {
      const text = inlineText(node);
      if (text.trim()) blocks.push({ text, id });
      return;
    }
    for (const child of node.content ?? []) walk(child, id);
  };
  if (doc) walk(doc, null);
  return blocks;
}

function makeSnippet(
  text: string,
  hits: [number, number][],
): { snippet: string; ranges: [number, number][] } {
  const firstStart = hits[0][0];
  const start = Math.max(0, firstStart - SNIPPET_BEFORE);
  const end = Math.min(text.length, start + SNIPPET_MAX);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  const body = text.slice(start, end).replace(/\s+/g, " ");
  // Collapsing whitespace can shift offsets; recompute ranges against the
  // un-collapsed slice only when lengths match, else fall back to the first
  // hit re-located in the collapsed body.
  const raw = text.slice(start, end);
  let ranges: [number, number][];
  if (raw.length === body.length) {
    ranges = hits
      .filter(([s, e]) => s >= start && e <= end)
      .map(([s, e]) => [s - start + prefix.length, e - start + prefix.length]);
  } else {
    const firstHit = text.slice(hits[0][0], hits[0][1]).replace(/\s+/g, " ");
    const at = body.indexOf(firstHit);
    ranges =
      at >= 0
        ? [[at + prefix.length, at + prefix.length + firstHit.length]]
        : [];
  }
  return { snippet: prefix + body + suffix, ranges };
}

export function findInPages(
  pages: Page[],
  query: string,
  opts: FindOptions,
): FindResult {
  const trimmed = query.trim() ? query : "";
  if (!trimmed) return EMPTY_RESULT;

  const { re, error } = buildMatcher(trimmed, opts);
  if (error) return { ...EMPTY_RESULT, error };
  if (!re) return EMPTY_RESULT;

  const results: FindPageResult[] = [];
  let totalMatches = 0;
  let truncated = false;

  outer: for (const page of pages) {
    const blocks = collectBlocks(page.content as JSONContent | undefined);
    const matches: FindMatch[] = [];
    let pageTotal = 0;

    for (let i = 0; i < blocks.length; i++) {
      const { text, id } = blocks[i];
      const hits: [number, number][] = [];
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) {
          // Zero-width regex match (e.g. "^") — advance or loop forever.
          re.lastIndex++;
          continue;
        }
        hits.push([m.index, m.index + m[0].length]);
        if (totalMatches + pageTotal + hits.length >= MAX_MATCHES) {
          truncated = true;
          break;
        }
      }
      if (hits.length) {
        const { snippet, ranges } = makeSnippet(text, hits);
        matches.push({
          blockId: id,
          blockIndex: i,
          snippet,
          ranges,
          count: hits.length,
        });
        pageTotal += hits.length;
      }
      if (truncated) break;
    }

    if (matches.length) {
      results.push({ page, matches, total: pageTotal });
      totalMatches += pageTotal;
    }
    if (truncated) break outer;
  }

  return { pages: results, totalMatches, truncated, error: null };
}