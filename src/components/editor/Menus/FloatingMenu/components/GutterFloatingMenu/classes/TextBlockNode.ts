import { Editor } from "@tiptap/react";
import { EditorNode } from "./EditorNode";
import type { MenuItem, TextBlockKind } from "../types";
import { getMenuItemsForNode } from "../functions/menuBuilder";


export class TextBlockNode extends EditorNode {
  kind: TextBlockKind
  onActiveChange: (name: string, attributes?: Record<string, unknown>) => boolean

  constructor(
    editor: Editor,
    pos: number,
    kind: TextBlockKind,
    onActiveChange: (name: string, attributes?: Record<string, unknown>) => boolean,
  ) {
    super(editor, pos)
    this.kind = kind
    this.onActiveChange = onActiveChange ?? undefined
  }

  setColor(color: string, target: 'text' | 'highlight') {
    const { state, view } = this.editor
    const node = state.doc.nodeAt(this.pos)
    if (!node) return

    const attrs = {
      ...node.attrs,
      ...(target === 'text'
        ? { color }
        : { backgroundColor: color })
    }

    const tr = state.tr.setNodeMarkup(this.pos, undefined, attrs)
    view.dispatch(tr)
  }

  setTextBlockStyle(style:
    'paragraph' | 'codeBlock' | 'blockquote'
    | 'orderedList' | 'bulletList' | 'heading 1'
    | 'heading 2' | 'heading 3'
  ) {
    switch (style) {
      case 'paragraph': this.editor.chain().focus().setNodeSelection(this.pos).setNode('paragraph').run()
        break;
      case 'codeBlock': this.editor.chain().focus().setNodeSelection(this.pos).setNode('codeBlock').run()
        break;
      case 'blockquote': this.editor.chain().focus().setNodeSelection(this.pos).toggleBlockquote().run()
        break;
      case 'orderedList': this.editor.chain().focus().setNodeSelection(this.pos).toggleOrderedList().run()
        break;
      case 'bulletList': this.editor.chain().focus().setNodeSelection(this.pos).toggleBulletList().run()
        break;
      case 'heading 1': this.editor.chain().focus().setNodeSelection(this.pos).setNode('heading', { level: 1 }).run()
        break;
      case 'heading 2': this.editor.chain().focus().setNodeSelection(this.pos).setNode('heading', { level: 2 }).run()
        break;
      case 'heading 3': this.editor.chain().focus().setNodeSelection(this.pos).setNode('heading', { level: 3 }).run()
        break;
    }
  }



  getMenuItems(): MenuItem[] {
    return getMenuItemsForNode(this)
  }
}