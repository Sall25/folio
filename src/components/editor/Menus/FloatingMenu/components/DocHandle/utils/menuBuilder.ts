import type { Editor } from "@tiptap/core"
import type { MenuItem } from "../../../../types";
import { ClipboardCopy, Copy, Download, PaintBucket, Redo, Turntable } from "lucide-react";
import { getColorMenuItems } from "./getColorMenuItems";
import { getFormatMenuItems } from "./getFormatMenuItems";

export type MenuProps = {
  editor: Editor
  options:
  | { target: 'FormattingMenu'; props: { pos: number; label: 'Text' | 'Blockquote' | 'Ordered list' | 'Bullet list' | 'Heading 1' | 'Heading 2' | 'Heading 3' } }
  | { target: 'CodeBlockMenu'; props: { pos: number } }
  | { target: 'HeadingMenu'; props: { pos: number } }
  | { target: 'ImageMenu'; props: { pos: number } }
  | { target: 'TocMenu'; props: { pos: number } }
  | { target: 'Others'; props: { pos: number; label: string } }
}

export function getMenuItems({ editor, options }: MenuProps): MenuItem[] {

  // --- Base commands common to all nodes ---
  const baseMenu: MenuItem[] = [
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

  if (options.target === "FormattingMenu") {
    return [
      {
        label: options.props.label,
        type: 'Title',
      },
      {
        label: "Color",
        type: "Sub",
        icon: PaintBucket,
        content: getColorMenuItems({ editor, pos: options.props.pos })
      },
      {
        label: 'Reset formatting',
        type: 'Item',
        icon: Redo
      },
      {
        label: "Turn into",
        type: "Sub",
        icon: Turntable,
        content: getFormatMenuItems({ editor, pos: options.props.pos })
      },
      {
        label: 'Separator',
        type: 'Separator'
      },
      ...baseMenu
    ]
  }
  else if (options.target === 'HeadingMenu') {
    return [
      {
        label: 'Heading',
        type: 'Title',
      },
      {
        label: "Color",
        type: "Sub",
        icon: PaintBucket,
        content: getColorMenuItems({ editor, pos: options.props.pos })
      },
      {
        label: "Turn into",
        type: "Sub",
        icon: Turntable,
        content: getFormatMenuItems({ editor, pos: options.props.pos })
      },
      {
        label: 'Separator',
        type: 'Separator'
      },
      ...baseMenu
    ]
  }
  else if (options.target === 'ImageMenu') {
    return [
      {
        label: 'Image',
        type: 'Title'
      },
      {
        label: 'Download image',
        type: 'Item',
        icon: Download
      },
      {
        label: ' ',
        type: 'Separator'
      },
      ...baseMenu
    ]
  }
  else if (options.target === 'CodeBlockMenu') {
    return [
      {
        label: 'Codeblock',
        type: 'Title',
      },
      {
        label: "Color",
        type: "Sub",
        icon: PaintBucket,
        content: getColorMenuItems({ editor, pos: options.props.pos })
      },
      {
        label: 'Separator',
        type: 'Separator'
      },
      ...baseMenu
    ]
  }
  else if (options.target === 'Others') {

    return [
      {
        label: options.props.label,
        type: 'Title'
      },
      {
        label: ' ',
        type: 'Separator'
      },
      ...baseMenu
    ]
  }
  return baseMenu
}