// menuBuilder.ts
import type { MenuItem } from "../types";
import { EditorNode, TextBlockNode, TableNode } from "../classes";

import { PaintBucket, Copy, ClipboardCopy, Turntable, AlignLeft, AlignCenter, AlignRight, Maximize2, Trash2 } from "lucide-react";
import { getColorMenuItems, getStyleMenuItems } from "./utils";

export function getMenuItemsForNode(node: EditorNode): MenuItem[] {

  // --- Base commands common to all nodes ---
  const baseMenu: MenuItem[] = [
    {
      label: "Duplicate node",
      type: "Item",
      icon: Copy,
      action: () => node.duplicate?.()
    },
    {
      label: "Copy to clipboard",
      type: "Item",
      icon: ClipboardCopy,
      action: () => node.copyToClipboard?.()
    }
  ];

  // --- Node-specific menus using instanceof ---
  if (node instanceof TextBlockNode) {
    return [
      {
        label: node.kind ?? "Text",
        type: "Title"
      },
      {
        label: "Color",
        type: "Sub",
        icon: PaintBucket,
        content: getColorMenuItems(node)
      },
      {
        label: "Turn into",
        type: "Sub",
        icon: Turntable,
        content: getStyleMenuItems(node)
      },
      ...baseMenu
    ];
  }

  if (node instanceof TableNode) {
    return [
      {
        label: 'Table',
        type: 'Title'
      },
      {
        label: "Color",
        type: "Sub",
        icon: PaintBucket,
        content: getColorMenuItems(node)
      },
      {
        label: "Alignment",
        type: "Sub",
        icon: AlignLeft,
        content: [
          { label: "Left", type: "Item", icon: AlignLeft, action: () => node.align("left") },
          { label: "Center", type: "Item", icon: AlignCenter, action: () => node.align("center") },
          { label: "Right", type: "Item", icon: AlignRight, action: () => node.align("right") },
        ]
      },
      {
        label: "Fit Width",
        type: "Item",
        icon: Maximize2,
        action: () => node.fitWidth()
      },
      {
        label: "Clear Content",
        type: "Item",
        icon: Trash2,
        action: () => node.clearContent()
      },
      ...baseMenu
    ];
  }

  // fallback for unknown node types
  return baseMenu;
}
