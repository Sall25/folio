import type { Editor } from "@tiptap/core";
import { type MenuItem } from "../../../../types";
import { Type, Circle } from "lucide-react";

export interface ColorMenuProps {
  editor: Editor
  options:
  | { target: 'column'; props: { tablePos: number; columnIndex: number; } }
  | { target: 'row'; props: { tablePos: number; rowIndex: number; } }
  | { target: 'cell'; props: { pos: number } }
  | { target: 'table'; props: { pos: number } }
}

export function getColorMenuItems({ editor, options }: ColorMenuProps): MenuItem[] {

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
        if (options.target === 'column') {
          editor.commands.setColumnStyle(
            options.props.columnIndex,
            options.props.tablePos,
            {
              color: color.value
            }
          )
        }
        else if (options.target === 'row') {
          editor.commands.setRowStyle(
            options.props.rowIndex,
            options.props.tablePos,
            {
              color: color.value
            }
          )
        }
        else if (options.target === 'table') {
          editor.commands.styleTable(
            options.props.pos,
            {
              color: color.value
            }
          )
        }
        else if (options.target === 'cell') {
          editor.commands.styleCell(
            options.props.pos,
            {
              color: color.value
            }
          )
        }
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
        if (options.target === 'column') {
          editor.commands.setColumnStyle(
            options.props.columnIndex,
            options.props.tablePos,
            {
              background: color.value
            }
          )
        } else if (options.target === 'row') {
          editor.commands.setRowStyle(
            options.props.rowIndex,
            options.props.tablePos,
            {
              background: color.value
            }
          )
        } else if (options.target === 'table') {
          editor.commands.styleTable(
            options.props.pos,
            {
              background: color.value
            }
          )
        } else if (options.target === 'cell') {
          editor.commands.styleCell(
            options.props.pos,
            {
              background: color.value
            }
          )
        }
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