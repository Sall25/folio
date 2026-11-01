import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSchema, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { EditorState } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { hasMergedCells } from "./has-merged-cells";
import { moveRow } from "./move-row";
import { moveColumn } from "./move-column";
import { sortColumn } from "./sort-column";
import { sortRow } from "./sort-row";
import { selectRow } from "./select-row";
import { selectColumn } from "./select-column";

// Guards for the table's row and column actions. Runs with `npm test` (the
// pre-commit hook and CI on every pull request). If one fails, the change
// breaks tables: fix it, don't edit the test to match.

const schema = getSchema([StarterKit, TableKit]);

type Cell = string | { text: string; colspan?: number; rowspan?: number };

/** A table at the top of the document (position 0); first row = headers. */
function tableDoc(rows: Cell[][]): PMNode {
  const cell = (c: Cell, header: boolean): JSONContent => {
    const { text, colspan = 1, rowspan = 1 } =
      typeof c === "string" ? { text: c } : c;
    return {
      type: header ? "tableHeader" : "tableCell",
      attrs: { colspan, rowspan },
      content: [
        { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
      ],
    };
  };
  return schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "table",
        content: rows.map((r, i) => ({
          type: "tableRow",
          content: r.map((c) => cell(c, i === 0)),
        })),
      },
    ],
  });
}

/** The table's text, row by row. */
function grid(doc: PMNode): string[][] {
  const table = doc.child(0);
  const out: string[][] = [];
  table.forEach((row) => {
    const r: string[] = [];
    row.forEach((cell) => r.push(cell.textContent));
    out.push(r);
  });
  return out;
}

const stateOf = (doc: PMNode) => EditorState.create({ schema, doc });

const NUMBERS = [
  ["Name", "Qty"],
  ["pear", "10"],
  ["apple", "2"],
  ["fig", "33"],
];

describe("table: move rows and columns", () => {
  it("moves a row down", () => {
    const state = stateOf(tableDoc(NUMBERS));
    const tr = moveRow(selectRow(state.tr, 1, 0), 1, 2);
    expect(grid(tr.doc).map((r) => r[0])).toEqual(["Name", "apple", "pear", "fig"]);
  });

  it("moves a column left", () => {
    const state = stateOf(tableDoc(NUMBERS));
    const tr = moveColumn(selectColumn(state.tr, 0, 1), 1, 0);
    expect(grid(tr.doc)[0]).toEqual(["Qty", "Name"]);
    expect(grid(tr.doc)[1]).toEqual(["10", "pear"]);
  });

  it("does nothing past the edge", () => {
    const state = stateOf(tableDoc(NUMBERS));
    expect(moveRow(selectRow(state.tr, 3, 0), 3, 4).docChanged).toBe(false);
    expect(moveColumn(selectColumn(state.tr, 0, 0), 0, -1).docChanged).toBe(false);
  });
});

describe("table: sort", () => {
  it("sorts a column as numbers, the header row stays on top", () => {
    const state = stateOf(tableDoc(NUMBERS));
    const asc = sortColumn(state.tr, 0, 1, "asc");
    expect(grid(asc.doc).map((r) => r[1])).toEqual(["Qty", "2", "10", "33"]);
    const desc = sortColumn(state.tr, 0, 1, "desc");
    expect(grid(desc.doc).map((r) => r[1])).toEqual(["Qty", "33", "10", "2"]);
  });

  it("sorts a column as text", () => {
    const state = stateOf(tableDoc(NUMBERS));
    const tr = sortColumn(state.tr, 0, 0, "asc");
    expect(grid(tr.doc).map((r) => r[0])).toEqual(["Name", "apple", "fig", "pear"]);
  });

  it("sorts a row's cells, moving whole columns", () => {
    const state = stateOf(tableDoc([["b", "c", "a"], ["2", "3", "1"]]));
    const tr = sortRow(state.tr, 0, 0, "asc");
    expect(grid(tr.doc)).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });
});

// A cell spanning two columns (or rows): moving, sorting or duplicating cell
// by cell tore the table apart. Now they do nothing on such a table.
describe("table: merged cells are left alone", () => {
  const merged = () =>
    tableDoc([
      ["A", "B", "C"],
      [{ text: "wide", colspan: 2 }, "x"],
      ["1", "2", "3"],
    ]);
  const tall = () =>
    tableDoc([
      ["A", "B"],
      [{ text: "tall", rowspan: 2 }, "x"],
      ["y"],
    ]);

  it("detects merged cells", () => {
    expect(hasMergedCells(merged().child(0))).toBe(true);
    expect(hasMergedCells(tall().child(0))).toBe(true);
    expect(hasMergedCells(tableDoc(NUMBERS).child(0))).toBe(false);
  });

  it("move row: unchanged", () => {
    const state = stateOf(tall());
    expect(moveRow(selectRow(state.tr, 2, 0), 2, 0).docChanged).toBe(false);
  });

  it("move column: unchanged", () => {
    const state = stateOf(merged());
    expect(moveColumn(selectColumn(state.tr, 0, 2), 2, 0).docChanged).toBe(false);
  });

  it("sort column and sort row: unchanged", () => {
    const state = stateOf(merged());
    expect(sortColumn(state.tr, 0, 2, "desc").docChanged).toBe(false);
    expect(sortRow(state.tr, 2, 0, "desc").docChanged).toBe(false);
  });

  it("the commands refuse: duplicate row/column, and moves/sorts report no change", () => {
    const src = readFileSync(
      resolve(__dirname, "../table-context/table-context-extension.ts"),
      "utf8",
    );
    expect(src.match(/hasMergedCells\(tableNode\)\) return false/g)?.length).toBe(2);
    expect(src.match(/\.docChanged\) return false/g)?.length).toBe(6);
  });
});
