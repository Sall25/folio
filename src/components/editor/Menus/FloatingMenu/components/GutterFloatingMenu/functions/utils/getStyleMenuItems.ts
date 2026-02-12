import type { MenuItem } from "../../types";
import { Code2, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Type } from "lucide-react";
import type { TextBlockNode } from "../../classes";

export function getStyleMenuItems(node: TextBlockNode): MenuItem[] {

  const { onActiveChange } = node

  return [
    {
      label: 'Turn into',
      type: 'Title',
    },
    {
      label: 'Text',
      type: 'Item',
      icon: Type,
      isActive: onActiveChange('paragraph'),
      action: () => node.setTextBlockStyle('paragraph')
    },
    {
      label: 'Heading 1',
      icon: Heading1,
      type: 'Item',
      isActive: onActiveChange('heading', { level: 1 }),
      action: () => node.setTextBlockStyle('heading 1')
    },
    {
      label: 'Heading 2',
      icon: Heading2,
      type: 'Item',
      isActive: onActiveChange('heading', { level: 2 }),
      action: () => node.setTextBlockStyle('heading 2')
    },
    {
      label: 'Heading 3',
      icon: Heading3,
      type: 'Item',
      isActive: onActiveChange('heading', { level: 3 }),
      action: () => node.setTextBlockStyle('heading 3')
    },
    {
      label: 'Bullet List',
      icon: List,
      type: 'Item',
      isActive: onActiveChange('bulletList'),
      action: () => node.setTextBlockStyle('bulletList')
    },
    {
      label: 'Ordered List',
      icon: ListOrdered,
      type: 'Item',
      isActive: onActiveChange('orderedList'),
      action: () => node.setTextBlockStyle('orderedList')
    },
    {
      label: 'Code Block',
      icon: Code2,
      type: 'Item',
      isActive: onActiveChange('codeBlock'),
      action: () => node.setTextBlockStyle('codeBlock')
    },
    {
      label: 'Blockquote',
      icon: Quote,
      type: 'Item',
      isActive: onActiveChange('blockquote'),
      action: () => node.setTextBlockStyle('blockquote')
    }

  ]
}
