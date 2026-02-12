import { type MenuItem } from "../../types";
import { Type, Circle } from "lucide-react";
import { TableNode, TextBlockNode, EditorNode } from "../../classes";

export function getColorMenuItems(node: EditorNode): MenuItem[] {

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

        if (node instanceof TextBlockNode) {
          node.setColor(color.value, 'text')
        }
        else if (node instanceof TableNode) {
          node.setColor(color.value, 'text')
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
        if (node instanceof TextBlockNode) {
          node.setColor(color.value, 'highlight')
          console.log('highlight applied')
        }
        else if (node instanceof TableNode) {
          node.setColor(color.value, 'highlight')
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