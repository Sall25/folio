/* eslint-disable @typescript-eslint/no-explicit-any */
// column.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { WrappedColumnView } from "./wrapped-column-view";

let globalDragNodePos: number | null = null;

// Listen for our custom event to capture the dragged node pos reliably
document.addEventListener("draghandle:dragstart", (e: Event) => {
  globalDragNodePos = (e as CustomEvent).detail.pos;
});
document.addEventListener("draghandle:dragend", () => {
  globalDragNodePos = null;
});

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

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("columnDropPlugin"),

        props: {
          /**
           * Handles drops onto column drop zones (the left/right indicators on column edges).
           * When a block is dragged and dropped onto a drop zone, this:
           * 1. Resolves the target column and its parent columnBlock positions
           * 2. Wraps the dragged node in a new column and inserts it at the correct index (left or right of the target)
           * 3. Redistributes column widths evenly across all columns including the new one
           * 4. Deletes the original dragged node from its old position
           * 5. Dispatches the transaction and returns true to prevent ProseMirror's default drop handling
           *
           * Returns false for any drop that doesn't target a column drop zone,
           * letting ProseMirror handle it normally.
           */
          handleDrop(view, event, _slice, moved) {
            if (!moved) return false;

            const target = event.target as HTMLElement | null;
            if (!target) return false;

            const dropZone = target.closest(
              "[data-drop-zone]",
            ) as HTMLElement | null;
            if (!dropZone) return false;

            const side = dropZone.dataset.dropZone as "left" | "right";
            const dragNodePos = globalDragNodePos;
            if (dragNodePos === null) return false;

            event.preventDefault();
            event.stopPropagation();

            const { state, dispatch } = view;

            const columnEl = dropZone.closest(
              "[data-node-view-wrapper]",
            ) as HTMLElement | null;
            if (!columnEl) return false;

            let colNodePos = -1;
            try {
              const domPos = view.posAtDOM(columnEl, 0);
              const $pos = state.doc.resolve(domPos);
              for (let d = $pos.depth; d >= 0; d--) {
                if ($pos.node(d).type.name === "column") {
                  colNodePos = $pos.before(d);
                  break;
                }
              }
            } catch {
              return false;
            }
            if (colNodePos === -1) return false;

            const $colNode = state.doc.resolve(colNodePos);
            let columnBlockDepth = -1;
            for (let i = $colNode.depth; i >= 0; i--) {
              if ($colNode.node(i).type.name === "columnBlock") {
                columnBlockDepth = i;
                break;
              }
            }
            if (columnBlockDepth === -1) return false;

            const columnBlockNode = $colNode.node(columnBlockDepth);
            const columnBlockPos = $colNode.before(columnBlockDepth);

            const dragNode = state.doc.nodeAt(dragNodePos);
            if (!dragNode) return false;
            if (dragNodePos === colNodePos) return false;

            console.log("dragNode type:", dragNode.type.name);
            console.log("dragNode content:", dragNode.content);
            console.log("colNodePos:", colNodePos);
            console.log("columnBlockPos:", columnBlockPos);
            console.log(
              "columnBlockNode childCount:",
              columnBlockNode.childCount,
            );

            const columnType = state.schema.nodes.column;
            const columnBlockType = state.schema.nodes.columnBlock;
            if (!columnType || !columnBlockType) return false;

            // Wrap dragNode itself in a column — don't use .content
            // since dragNode might already be a valid block (paragraph, heading etc.)
            const dragContent =
              dragNode.type.name === "column"
                ? dragNode.content // already a column, use its content
                : state.schema.nodes.paragraph.create(
                    {},
                    dragNode.isText ? dragNode : dragNode.content,
                  );

            let targetColumnIndex = -1;
            let offset = 0;
            columnBlockNode.forEach((child: any, _: number, index: number) => {
              const childPos = columnBlockPos + 1 + offset;
              if (childPos === colNodePos) targetColumnIndex = index;
              offset += child.nodeSize;
            });

            console.log("targetColumnIndex:", targetColumnIndex);
            console.log(
              "insertIndex:",
              side === "left" ? targetColumnIndex : targetColumnIndex + 1,
            );

            if (targetColumnIndex === -1) return false;

            const insertIndex =
              side === "left" ? targetColumnIndex : targetColumnIndex + 1;
            const newCount = columnBlockNode.childCount + 1;
            const newWidth = `${Math.round(100 / newCount)}%`;

            const newColumns: any[] = [];
            columnBlockNode.forEach((col: any, _: number, index: number) => {
              if (index === insertIndex) {
                newColumns.push(
                  columnType.create({ width: newWidth }, dragContent),
                );
              }
              newColumns.push(
                columnType.create({ width: newWidth }, col.content),
              );
            });
            if (insertIndex >= columnBlockNode.childCount) {
              newColumns.push(
                columnType.create({ width: newWidth }, dragContent),
              );
            }

            const newColumnBlock = columnBlockType.create({}, newColumns);

            const tr = state.tr;
            tr.replaceWith(
              columnBlockPos,
              columnBlockPos + columnBlockNode.nodeSize,
              newColumnBlock,
            );

            const adjustedDragPos =
              dragNodePos < columnBlockPos
                ? dragNodePos
                : dragNodePos +
                  (newColumnBlock.nodeSize - columnBlockNode.nodeSize);

            const adjustedDragNode = tr.doc.nodeAt(adjustedDragPos);
            if (adjustedDragNode) {
              tr.delete(
                adjustedDragPos,
                adjustedDragPos + adjustedDragNode.nodeSize,
              );
            }

            dispatch(tr);
            globalDragNodePos = null;
            return true;
          },
          handleDOMEvents: {
            dragover(_view, event) {
              const target = event.target as HTMLElement | null;
              if (!target) return false;

              document
                .querySelectorAll(".column-drop-active")
                .forEach((el) => el.classList.remove("column-drop-active"));

              const dropZone = target.closest(
                "[data-drop-zone]",
              ) as HTMLElement | null;
              if (dropZone) {
                event.preventDefault();
                dropZone.classList.add("column-drop-active");
              }

              return false;
            },

            dragleave(_view, event) {
              const target = event.target as HTMLElement | null;
              const dropZone = target?.closest("[data-drop-zone]");
              if (dropZone) {
                dropZone.classList.remove("column-drop-active");
              }
              return false;
            },

            drop() {
              document
                .querySelectorAll(".column-drop-active")
                .forEach((el) => el.classList.remove("column-drop-active"));
              return false;
            },
          },
        },
      }),
    ];
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
