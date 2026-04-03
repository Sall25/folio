/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { WrappedColumnView } from "./wrapped-column-view";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const Column = Node.create({
  name: "column",
  content: "block*",
  group: "block",
  isolating: true,
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      width: {
        default: "50%",
        parseHTML: (el) => el.style.flexBasis || el.style.width || "50%",
        renderHTML: (attrs) => ({
          style: `flex-basis: ${attrs.width}; flex-shrink: 0; flex-grow: 0;`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='column']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "column" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WrappedColumnView);
  },

  // addProseMirrorPlugins() {
  //   return [
  //     new Plugin({
  //       key: new PluginKey("columnEmptyCleanup"),
  //       appendTransaction(transactions, oldState, newState) {
  //         // Only run if the doc actually changed
  //         if (!transactions.some((tr) => tr.docChanged)) return null;

  //         const tr = newState.tr;
  //         let modified = false;

  //         newState.doc.forEach((topNode, topOffset) => {
  //           if (topNode.type.name !== "columnBlock") return;

  //           const columnBlockPos = topOffset;
  //           const emptyColumns: { pos: number; node: any; index: number }[] =
  //             [];

  //           topNode.forEach((child, childOffset, index) => {
  //             if (child.type.name !== "column") return;
  //             if (isColumnEffectivelyEmpty(child)) {
  //               emptyColumns.push({
  //                 pos: columnBlockPos + 1 + childOffset,
  //                 node: child,
  //                 index,
  //               });
  //             }
  //           });

  //           if (emptyColumns.length === 0) return;

  //           // If all columns are empty or only one would remain, delete the whole columnBlock
  //           const remainingCount = topNode.childCount - emptyColumns.length;
  //           if (remainingCount <= 0) {
  //             tr.delete(columnBlockPos, columnBlockPos + topNode.nodeSize);
  //             const paragraphType = newState.schema.nodes.paragraph;
  //             if (paragraphType) {
  //               tr.insert(columnBlockPos, paragraphType.create());
  //             }
  //             modified = true;
  //             return;
  //           }

  //           // Delete empty columns in reverse order to preserve positions
  //           const sorted = [...emptyColumns].sort((a, b) => b.pos - a.pos);
  //           for (const { pos, node } of sorted) {
  //             tr.delete(pos, pos + node.nodeSize);
  //           }

  //           // Redistribute widths among remaining columns
  //           const newWidthValue = `${Math.round(100 / remainingCount)}%`;
  //           const emptyIndices = new Set(emptyColumns.map((c) => c.index));

  //           let childOffset = 0;
  //           let adjustedOffset = 0;
  //           topNode.forEach((child, _, index) => {
  //             if (child.type.name === "column") {
  //               if (!emptyIndices.has(index)) {
  //                 const absPos = columnBlockPos + 1 + childOffset;
  //                 // Calculate how much was deleted before this node
  //                 let deletedBefore = 0;
  //                 for (const {
  //                   pos,
  //                   node: deletedNode,
  //                   index: di,
  //                 } of emptyColumns) {
  //                   if (di < index) deletedBefore += deletedNode.nodeSize;
  //                 }
  //                 tr.setNodeMarkup(absPos - deletedBefore, undefined, {
  //                   ...child.attrs,
  //                   width: newWidthValue,
  //                 });
  //               }
  //             }
  //             childOffset += child.nodeSize;
  //           });

  //           modified = true;
  //         });

  //         return modified ? tr : null;
  //       },
  //     }),
  //   ];
  // },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        let insideColumn = false;
        for (let i = $from.depth; i >= 0; i--) {
          if ($from.node(i).type.name === "column") {
            insideColumn = true;
            break;
          }
        }
        if (!insideColumn) return false;

        const handled = editor.commands.splitBlock();
        if (handled) {
          editor.commands.unsetAllMarks();
        }
        return handled;
      },

      Backspace: ({ editor }) => {
        return handleColumnElimination(editor, "Backspace");
      },

      Delete: ({ editor }) => {
        return handleColumnElimination(editor, "Delete");
      },
    };
  },
});

function isColumnEffectivelyEmpty(columnNode: any): boolean {
  if (columnNode.childCount !== 1) return false;
  const onlyChild = columnNode.child(0);
  return onlyChild.textContent === "";
}

function handleColumnElimination(
  editor: any,
  key: "Backspace" | "Delete",
): boolean {
  const { state } = editor.view;
  const { selection, doc } = state;
  const { $from } = selection;

  // Find the column node and its depth
  let columnDepth = -1;
  for (let i = $from.depth; i >= 0; i--) {
    if ($from.node(i).type.name === "column") {
      columnDepth = i;
      break;
    }
  }
  if (columnDepth === -1) return false;

  const columnNode = $from.node(columnDepth);
  const columnPos = $from.before(columnDepth);

  if (!isColumnEffectivelyEmpty(columnNode)) return false;

  // Check cursor is at the boundary
  const blockDepth = columnDepth + 1;
  const blockStart = $from.start(blockDepth);
  const blockEnd = $from.end(blockDepth);
  const cursorPos = $from.pos;

  if (key === "Backspace" && cursorPos !== blockStart) return false;
  if (key === "Delete" && cursorPos !== blockEnd) return false;

  // Find the parent columnBlock
  let columnBlockDepth = -1;
  for (let i = columnDepth - 1; i >= 0; i--) {
    if ($from.node(i).type.name === "columnBlock") {
      columnBlockDepth = i;
      break;
    }
  }
  if (columnBlockDepth === -1) return false;

  const columnBlockNode = $from.node(columnBlockDepth);
  const columnBlockPos = $from.before(columnBlockDepth);

  const tr = state.tr;

  // If only one column remains, delete the entire columnBlock
  if (columnBlockNode.childCount <= 1) {
    tr.delete(columnBlockPos, columnBlockPos + columnBlockNode.nodeSize);
    const paragraphType = state.schema.nodes.paragraph;
    if (paragraphType) {
      tr.insert(columnBlockPos, paragraphType.create());
    }
    editor.view.dispatch(tr);
    return true;
  }

  // First pass: find the index of the empty column by position
  let emptyColumnIndex = -1;
  let childOffset = 0;
  columnBlockNode.forEach((child: any, _: number, index: number) => {
    const childAbsPos = columnBlockPos + 1 + childOffset;
    if (childAbsPos === columnPos) {
      emptyColumnIndex = index;
    }
    childOffset += child.nodeSize;
  });

  if (emptyColumnIndex === -1) return false;

  // Delete the empty column
  tr.delete(columnPos, columnPos + columnNode.nodeSize);

  // Second pass: redistribute widths, skipping the deleted column by index
  const remainingCount = columnBlockNode.childCount - 1;
  const newWidthValue = `${Math.round(100 / remainingCount)}%`;

  childOffset = 0;
  columnBlockNode.forEach((child: any, _: number, index: number) => {
    if (index !== emptyColumnIndex && child.type.name === "column") {
      // Columns after the deleted one shift left by the deleted node's size
      const shift = index > emptyColumnIndex ? columnNode.nodeSize : 0;
      const childAbsPos = columnBlockPos + 1 + childOffset - shift;

      tr.setNodeMarkup(childAbsPos, undefined, {
        ...child.attrs,
        width: newWidthValue,
      });
    }
    childOffset += child.nodeSize;
  });

  // Place cursor in the adjacent column
  const resolvedPos = tr.doc.resolve(
    Math.min(columnPos, tr.doc.content.size - 1),
  );
  tr.setSelection((selection.constructor as any).near(resolvedPos));

  editor.view.dispatch(tr);
  return true;
}
