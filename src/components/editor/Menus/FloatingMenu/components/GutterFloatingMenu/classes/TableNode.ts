import { getMenuItemsForNode } from "../functions/menuBuilder";
import type { MenuItem } from "../types";
import { EditorNode } from "./EditorNode"

import { Editor } from "@tiptap/react"
import { Node as PMNode } from "@tiptap/pm/model"

export function getNodeRangeAt(editor: Editor, pos: number): {
  node: PMNode
  from: number
  to: number
} | null {
  const { doc } = editor.state

  const node = doc.nodeAt(pos)
  if (!node) return null

  return {
    node,
    from: pos,
    to: pos + node.nodeSize,
  }
}


export function setNodeColorAt(
  editor: Editor,
  pos: number,
  color: string,
  type: "text" | "highlight"
) {
  const result = getNodeRangeAt(editor, pos)
  if (!result) return false

  const { node, from } = result

  const attrs = {
    ...node.attrs,
    ...(type === "text"
      ? { color }
      : { background: color }),
  }

  const tr = editor.state.tr.setNodeMarkup(from, undefined, attrs)
  editor.view.dispatch(tr)
  console.log('color applied')

  return true
}


export class TableNode extends EditorNode {
  constructor(editor: Editor, pos: number) {
    super(editor, pos)
  }

  setColor(color: string, target: 'text' | 'highlight') {
    setNodeColorAt(this.editor, this.pos, color, target)
  }

  align(dir: 'left' | 'right' | 'center' | 'justify') {
    const tableNode = this.editor.state.doc.nodeAt(this.pos);
    if (!tableNode || tableNode.type.name !== "table") return;

    const tr = this.editor.state.tr;
    tableNode.descendants((node, offset) => {
      if (node.type.name === "tableCell") {
        const cellPos = this.pos + offset;
        tr.setNodeMarkup(cellPos, undefined, {
          ...node.attrs,
          textAlign: dir
        });
      }
    });
    this.editor.view.dispatch(tr);
  }

  fitWidth() {
    const tableNode = this.editor.state.doc.nodeAt(this.pos);
    if (!tableNode || tableNode.type.name !== "table") return;

    const colCount = tableNode.firstChild?.childCount ?? 0;
    if (!colCount) return;

    const widthPercent = Math.floor(100 / colCount);

    const tr = this.editor.state.tr;
    tableNode.descendants((node, offset) => {
      if (node.type.name === "tableColumn") {
        const colPos = this.pos + offset;
        tr.setNodeMarkup(colPos, undefined, {
          ...node.attrs,
          width: `${widthPercent}%`
        });
      }
    });

    this.editor.view.dispatch(tr);
  }

  clearContent() {
    const { editor, pos } = this;
    const tableNode = editor.state.doc.nodeAt(pos);
    if (!tableNode || tableNode.type.name !== "table") return;

    const tr = editor.state.tr;
    tableNode.descendants((node, offset) => {
      if (node.type.name === "tableCell") {
        const cellPos = pos + offset;
        // Replace content with an empty paragraph
        tr.replaceWith(
          cellPos + 1,
          cellPos + 1 + node.content.size,
          editor.state.schema.nodes.paragraph.create()
        );
      }
    });
    editor.view.dispatch(tr)
  }

  getMenuItems(): MenuItem[] {
    return getMenuItemsForNode(this)
  }
}