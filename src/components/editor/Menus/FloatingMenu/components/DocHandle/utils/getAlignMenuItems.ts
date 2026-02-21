import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
import { RowNode, type EditorNode } from "../../GutterFloatingMenu/classes";
import type { MenuItem } from "../../../../types";
import { ColumnNode } from "../../GutterFloatingMenu/classes/ColumnNode";

export function getAlignMenuItems(node: EditorNode): MenuItem[] {
  return [
    {
      label: 'Align left',
      type: 'Item',
      icon: AlignLeft,
      action: () => {
        if (node instanceof ColumnNode || node instanceof RowNode) {
          node.align('left')
        }
      }
    },
    {
      label: 'Align right',
      type: 'Item',
      icon: AlignRight,
      action: () => {
        if (node instanceof ColumnNode || node instanceof RowNode) {
          node.align('right')
        }

      }
    },
    {
      label: 'Align center',
      type: 'Item',
      icon: AlignCenter,
      action: () => {
        if (node instanceof ColumnNode || node instanceof RowNode) {
          node.align('center')
        }
      }
    },
    {
      label: 'Align justify',
      type: 'Item',
      icon: AlignJustify,
      action: () => {
        if (node instanceof ColumnNode || node instanceof RowNode) {
          node.align('justify')
        }
      }
    }
  ]
}