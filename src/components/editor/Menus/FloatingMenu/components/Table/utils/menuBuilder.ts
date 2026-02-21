// menuBuilder.ts
import { type MenuItem } from "../../../../types";
import { Copy, ClipboardCopy, PaintBucket, AlignLeft, Maximize2, Trash2, Merge } from "lucide-react";
import { getColOrRowMenuItems } from './getColOrRowMenuItems'
import { getColorMenuItems, type ColorMenuProps } from "./getColorMenuItems";
import { getAlignMenuItems } from './getAlignMenuItems'
import type { Editor } from "@tiptap/core";

type MenuProps = ColorMenuProps | { editor: Editor, options: { target: 'cells', props: { pos: number } } }

export function getMenuItems({ editor, options }: MenuProps): MenuItem[] {

  if (options.target === 'table') {
    return [
      {
        label: 'Table',
        type: 'Title'
      },
      {
        label: "Color",
        type: "Sub",
        icon: PaintBucket,
        content: getColorMenuItems({ editor, options })
      },
      {
        label: "Alignment",
        type: "Sub",
        icon: AlignLeft,
        content: getAlignMenuItems({ editor, options })
      },
      {
        label: "Fit Width",
        type: "Item",
        icon: Maximize2,
        action: () => editor.commands.fitTableWidth(options.props.pos)
      },
      {
        label: "Clear Content",
        type: "Item",
        icon: Trash2,
        action: () => editor.commands.clearTableContent(options.props.pos)
      },
      {
        label: "Duplicate node",
        type: "Item",
        icon: Copy,
        action: () => { }
      },
      {
        label: "Copy to clipboard",
        type: "Item",
        icon: ClipboardCopy,
        action: () => { }
      }

    ];
  }

  if (options.target === 'cell' || options.target === 'cells') {
    if (options.target === 'cells') {
      return [
        {
          label: 'Cell',
          type: 'Title'
        },
        {
          label: 'Merge Cells',
          type: 'Item',
          icon: Merge,
          action: () => {
            editor.commands.mergeCells()
          },
        },
        {
          label: "Color",
          type: "Sub",
          icon: PaintBucket,
          content: getColorMenuItems({ editor, options: { target: 'cell', props: { pos: options.props.pos } } })
        },
        {
          label: "Alignment",
          type: "Sub",
          icon: AlignLeft,
          content: getAlignMenuItems({ editor, options: { target: 'cell', props: { pos: options.props.pos } } })
        },

      ]
    }
    return [
      {
        label: 'Cell',
        type: 'Title'
      },
      {
        label: "Color",
        type: "Sub",
        icon: PaintBucket,
        content: getColorMenuItems({ editor, options: { target: 'cell', props: { pos: options.props.pos } } })
      },
      {
        label: "Alignment",
        type: "Sub",
        icon: AlignLeft,
        content: getAlignMenuItems({ editor, options: { target: 'cell', props: { pos: options.props.pos } } })
      },

    ]
  }

  if (options.target === 'column') {
    return getColOrRowMenuItems({ editor, options })
  }

  if (options.target === 'row') {
    return getColOrRowMenuItems({ editor, options })
  }

  return []
}
