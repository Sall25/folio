import type { MenuItem } from "../../../../types";
import { Code2, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Type } from "lucide-react";
import type { Editor } from "@tiptap/core";
import type { MenuProps } from "./menuBuilder";

export type FormattingTypes =
  'paragraph' | 'codeBlock' | 'blockquote'
  | 'orderedList' | 'bulletList' | 'heading 1'
  | 'heading 2' | 'heading 3'

type FormatMenuProps = Pick<MenuProps, 'editor'> & { pos: number }

export const format = (editor: Editor, pos: number, target: FormattingTypes) => {
  switch (target) {
    case 'paragraph': editor.chain().focus().setNodeSelection(pos).setNode('paragraph').run()
      break;
    case 'codeBlock': editor.chain().focus().setNodeSelection(pos).setNode('codeBlock').run()
      break;
    case 'blockquote': editor.chain().focus().setNodeSelection(pos).toggleBlockquote().run()
      break;
    case 'orderedList': editor.chain().focus().setNodeSelection(pos).toggleOrderedList().run()
      break;
    case 'bulletList': editor.chain().focus().setNodeSelection(pos).toggleBulletList().run()
      break;
    case 'heading 1': editor.chain().focus().setNodeSelection(pos).setNode('heading', { level: 1 }).run()
      break;
    case 'heading 2': editor.chain().focus().setNodeSelection(pos).setNode('heading', { level: 2 }).run()
      break;
    case 'heading 3': editor.chain().focus().setNodeSelection(pos).setNode('heading', { level: 3 }).run()
      break;
  }
}

export function getFormatMenuItems({ editor, pos }: FormatMenuProps): MenuItem[] {

  return [
    {
      label: 'Turn into',
      type: 'Title',
    },
    {
      label: 'Text',
      type: 'Item',
      icon: Type,
      action: () => format(editor, pos, 'paragraph')
    },
    {
      label: 'Heading 1',
      icon: Heading1,
      type: 'Item',
      action: () => format(editor, pos, 'heading 1')
    },
    {
      label: 'Heading 2',
      icon: Heading2,
      type: 'Item',
      action: () => format(editor, pos, 'heading 2')
    },
    {
      label: 'Heading 3',
      icon: Heading3,
      type: 'Item',
      action: () => format(editor, pos, 'heading 3')
    },
    {
      label: 'Bullet List',
      icon: List,
      type: 'Item',
      action: () => format(editor, pos, 'bulletList')
    },
    {
      label: 'Ordered List',
      icon: ListOrdered,
      type: 'Item',
      action: () => format(editor, pos, 'orderedList')
    },
    {
      label: 'Code Block',
      icon: Code2,
      type: 'Item',
      action: () => format(editor, pos, 'codeBlock')
    },
    {
      label: 'Blockquote',
      icon: Quote,
      type: 'Item',
      action: () => format(editor, pos, 'blockquote')
    }

  ]
}
