import type { Editor } from "@tiptap/core";
import type { Node, ResolvedPos } from "@tiptap/pm/model";
import { readDatabaseData } from "src/features/database/utils/database-bridge";

// Which block gets the drag handle when blocks are nested (a toggle, a
// callout, a list, a table cell, columns). Kept apart from the component so
// the rules can be tested without a browser: drag-handle-rules.test.ts
// runs before every commit (.githooks/pre-commit). A change here that
// breaks an earlier fix fails the commit.

// Records of these views are rows: they get the handle (and its record
// menu). Cards (board, gallery, calendar) have their own controls; the
// handle goes to the database itself there.
//
// A timeline is a row view too. Its records are rows in the table beside
// the grid — the same .db-record elements the drop target measures — and
// its bar is drawn from the row rather than instead of it.
const ROW_VIEWS = new Set(["table", "list", "timeline"]);

export function basePenalty(
  editor: Editor | null,
  node: Node,
  parent: Node | null,
  isFirst: boolean,
) {
  const name = node.type.name;
  const parentName = parent?.type.name;
  if (name === "column" || name === "columnBlock" || name === "title") {
    return 1000;
  }

  // Parts of a block, never moved on their own: a table's rows and
  // cells (they have their own grips), a toggle's title and body, a
  // tab, a code group's file.
  if (
    name === "tableRow" ||
    name === "tableCell" ||
    name === "tableHeader" ||
    name === "appendixSummary" ||
    name === "tab" ||
    name === "codeGroupItem"
  ) {
    return 1000;
  }

  // A plain cell (just its text): the table is what's dragged. A cell
  // with blocks (a list, a callout, code…) gives each its own handle.
  if (
    (parentName === "tableCell" || parentName === "tableHeader") &&
    parent?.childCount === 1 &&
    name === "paragraph"
  ) {
    return 1000;
  }

  // A list item's first line is the item, and a callout's first block, of
  // any kind (text, a toggle, a database, an image…), is the callout, so a
  // callout can always be grabbed by its first block. What's inside that
  // block (a toggle's content, a database's rows, a list's items) keeps
  // its own handles.
  if (
    isFirst &&
    (parentName === "listItem" ||
      parentName === "taskItem" ||
      parentName === "callout")
  ) {
    return 1000;
  }

  // Items are dragged, not their whole list.
  if (name === "bulletList" || name === "orderedList" || name === "taskList") {
    return 1000;
  }

  if (name === "databaseRecord") {
    const databaseId = node.attrs.databaseId as string | null;
    const viewType =
      editor && databaseId
        ? readDatabaseData(editor, databaseId)?.view?.type
        : undefined;
    if (viewType && !ROW_VIEWS.has(viewType)) return 1000;
    // A row beats its database (below), so the handle stays on rows — by
    // more than the edge rule's strength (500 in makeNestedOptions), which
    // pulls the handle out to the containing block as the pointer nears a
    // left edge. A timeline's rows sit at the window's left edge whenever
    // the sidebar is collapsed, so a margin of 50 over the database lost
    // the row the handle there, seemingly at random.
    return -800;
  }

  // A database over whatever it sits in.
  if (name === "database") return -250;

  // A quote moves as one block, its lines with it.
  if (name === "blockquote") return -200;

  return 500;
}

export const makeNestedOptions = (editor: Editor | null) => ({
  enabled: true,
  edgeDetection: {
    threshold: -80,
    edges: ["left" as const],
    strength: 500,
  },

  // The innermost block under the pointer gets the handle (a list item, a
  // block in a callout or a table cell), Notion-style: every candidate scores
  // the same and the deepest wins, except the cases below. Scores are
  // penalties (1000 = never the handle's; negative = preferred).
  rules: [
    {
      id: "preferNodeLabels",
      evaluate: ({
        node,
        parent,
        isFirst,
        depth,
        $pos,
      }: {
        node: Node;
        parent: Node | null;
        isFirst: boolean;
        depth: number;
        $pos: ResolvedPos;
      }) => {
        const penalty = basePenalty(editor, node, parent, isFirst);
        if (penalty >= 1000) return penalty; // never a target: unchanged

        // Inside a toggle's content, at any depth: beat the edge rule, which
        // takes 500 × depth once the pointer moves left onto the handle.
        // Deeper blocks get a bigger bonus, so the innermost one still wins,
        // and the relative order of the other rules is kept.
        for (let d = depth - 1; d > 0; d--) {
          if ($pos.node(d).type.name === "appendixContent") {
            return penalty - (500 * depth - 400);
          }
        }
        return penalty;
      },
    },
  ],
});
