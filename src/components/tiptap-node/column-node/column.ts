/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { WrappedColumnView } from "./wrapped-column-view";

export const Column = Node.create({
  name: "column",
  content: "block*",
  group: "block",
  isolating: false,
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

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        if (this.editor.isActive("listItem")) {
          return editor.commands.splitListItem("listItem");
        }

        if (this.editor.isActive("taskItem")) {
          return editor.commands.splitListItem("taskItem");
        }

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
  const { selection } = state;
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
