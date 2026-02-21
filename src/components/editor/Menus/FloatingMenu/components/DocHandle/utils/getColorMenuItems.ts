import { type MenuItem } from "../../../../types";
import { Type, Circle } from "lucide-react";
import type { MenuProps } from "./menuBuilder";
import type { Editor } from "@tiptap/core";

type ColorMenuProps = Pick<MenuProps, 'editor'> & { pos: number }

const setColor = (editor: Editor, pos: number, color: string, target: 'text' | 'highlight') => {
  const { state, view } = editor
  const node = state.doc.nodeAt(pos)
  if (!node) return

  const attrs = {
    ...node.attrs,
    ...(target === 'text'
      ? { color }
      : { background: color })
  }

  const tr = state.tr.setNodeMarkup(pos, undefined, attrs)
  view.dispatch(tr)
}

export function getColorMenuItems({ editor, pos }: ColorMenuProps): MenuItem[] {

  const getColors = (tag: string) => {
    return [
      { label: `Default ${tag}`, value: '#808080' },
      { label: `Gray ${tag}`, value: '#808080' },
      { label: `Red ${tag}`, value: '#EF4444' },
      { label: `Orange ${tag}`, value: '#F97316' },
      { label: `Yellow ${tag}`, value: '#EAB308' },
      { label: `Green ${tag}`, value: '#22C55E' },
      { label: `Blue ${tag}`, value: '#3B82F6' },
      { label: `Purple ${tag}`, value: '#A855F7' },
      { label: `Pink ${tag}`, value: '#EC4899' },
      { label: `Brown ${tag}`, value: '#92400E' }
    ]
  }

  const textColorMenuItems: MenuItem[] = getColors('text').map((color) => (
    {
      label: color.label,
      type: 'Item',
      icon: Type,
      color: { color: color.value, type: 'text' },
      action: () => {
        setColor(editor, pos, color.value, 'text')
      }

    }
  ))

  const highlightMenuItems: MenuItem[] = getColors('background').map((color) => (
    {
      label: color.label,
      type: 'Item',
      icon: Circle,
      color: { color: color.value, type: 'highlight' },
      action: () => {
        setColor(editor, pos, color.value, 'highlight')
      }
    }
  ))
  return [
    {
      label: 'Text color',
      type: 'Title'
    },
    ...textColorMenuItems,
    {
      label: 'Separator',
      type: 'Separator'
    },
    {
      label: 'Background color',
      type: 'Title'
    },
    ...highlightMenuItems
  ]
}