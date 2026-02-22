import type { ComponentType } from "react";
import { type MenuItem } from "../../../types";
import { AlignCenter, PaintBucket, SortAsc, SortDesc, SquareArrowLeft, SquareArrowRight, /*Trash,*/ XSquare } from "lucide-react";
import { getColorMenuItems, type ColorMenuProps } from "./getColorMenuItems";
import { getAlignMenuItems } from "./getAlignMenuItems";

type ColOrRowMenuProps = ColorMenuProps

export function getColOrRowMenuItems({ editor, options }: ColOrRowMenuProps): MenuItem[] {
  const getLabels = (tag: string): {
    label: string;
    type: 'Item' | 'Sub' | 'Separator';
    icon?: ComponentType<Record<string, unknown>>
    action?: () => void
    content?: MenuItem[]
  }[] => {
    return [
      {
        label: `Insert ${tag} ${tag === 'column' ? 'left' : 'above'}`,
        type: 'Item',
        icon: SquareArrowLeft,
        action: () => {
          if (options.target === 'column') {
            editor.commands.addColumnBefore()
          }
          else if (options.target === 'row') {
            editor.commands.addRowBefore()
          }
        }
      },
      {
        label: `Insert ${tag}  ${tag === 'column' ? 'right' : 'below'}`,
        type: 'Item',
        icon: SquareArrowRight,
        action: () => {
          if (options.target === 'column') {
            editor.commands.addColumnAfter()
          }
          else if (options.target === 'row') {
            editor.commands.addRowAfter()
          }
        }
      },
      { label: '', type: 'Separator' }, // Separator
      {
        label: `Sort ${tag} A-Z`,
        type: 'Item',
        icon: SortAsc,
        action: () => {
          if (options.target === 'column') {
            editor.commands.sortColumn(
              options.props.columnIndex,
              options.props.tablePos,
              'asc'
            )
          }
          else if (options.target === 'row') {
            editor.commands.sortRow(
              options.props.rowIndex,
              options.props.tablePos,
              'asc'
            )
          }
        }
      },
      {
        label: `Sort ${tag} Z-A`,
        type: 'Item',
        icon: SortDesc,
        action: () => {
          if (options.target === 'column') {
            editor.commands.sortColumn(
              options.props.columnIndex,
              options.props.tablePos,
              'desc'
            )
          }
          else if (options.target === 'row') {
            editor.commands.sortRow(
              options.props.rowIndex,
              options.props.tablePos,
              'desc'
            )
          }
        }
      },
      { label: '', type: 'Separator' }, // Separator
      {
        label: 'Color',
        icon: PaintBucket,
        type: 'Sub',
        content: getColorMenuItems({ editor, options })
      },
      {
        label: 'Alignment',
        icon: AlignCenter,
        type: 'Sub',
        content: getAlignMenuItems({ editor, options })
      },
      {
        label: `Clear ${tag} contents`,
        type: 'Item',
        icon: XSquare,
        action: () => {
          if (options.target === 'column') {
            editor.commands.clearColumnContent(
              options.props.columnIndex,
              options.props.tablePos
            )
          }
          else if (options.target === 'row') {
            editor.commands.clearRowContent(
              options.props.rowIndex,
              options.props.tablePos
            )
          }
        }
      },
      // { label: '', type: 'Separator' }, // Separator
      // {
      //   label: `Delete ${tag}`,
      //   type: 'Item',
      //   icon: Trash,
      //   action: () => {

      //   }
      // },
    ]
  }

  if (options.target === 'column') {
    const colMenuItems: MenuItem[] = getLabels('column').map((col) => ({
      label: col.label,
      type: col.type,
      icon: col.icon,
      content: col.content,
      action: col.action
    }))
    return colMenuItems
  }

  const rowMenuItems: MenuItem[] = getLabels('row').map((row) => ({
    label: row.label,
    type: row.type,
    icon: row.icon,
    content: row.content,
    action: row.action
  }))
  return rowMenuItems
}