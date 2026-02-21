import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
import { type MenuItem } from "../../../../types";
import type { ColorMenuProps } from "./getColorMenuItems";

type AlignMenuProps = ColorMenuProps

export function getAlignMenuItems({ editor, options }: AlignMenuProps): MenuItem[] {
  return [
    {
      label: 'Align left',
      type: 'Item',
      icon: AlignLeft,
      action: () => {
        if (options.target === 'column') {
          editor.commands.setColumnStyle(
            options.props.columnIndex,
            options.props.tablePos,
            {
              textAlign: 'left'
            }
          )
        } else if (options.target === 'row') {
          editor.commands.setRowStyle(
            options.props.rowIndex,
            options.props.tablePos,
            {
              textAlign: 'left'
            }
          )
        } else if (options.target === 'table') {
          editor.commands.styleTable(
            options.props.pos,
            {
              textAlign: 'left'
            }
          )
        } else if (options.target === 'cell') {
          editor.commands.styleCell(
            options.props.pos,
            {
              textAlign: 'left'
            }
          )
        }
      }
    },
    {
      label: 'Align right',
      type: 'Item',
      icon: AlignRight,
      action: () => {
        if (options.target === 'column') {
          editor.commands.setColumnStyle(
            options.props.columnIndex,
            options.props.tablePos,
            {
              textAlign: 'right'
            }
          )
        } else if (options.target === 'row') {
          editor.commands.setRowStyle(
            options.props.rowIndex,
            options.props.tablePos,
            {
              textAlign: 'right'
            }
          )
        } else if (options.target === 'table') {
          editor.commands.styleTable(
            options.props.pos,
            {
              textAlign: 'right'
            }
          )
        } else if (options.target === 'cell') {
          editor.commands.styleCell(
            options.props.pos,
            {
              textAlign: 'right'
            }
          )
        }
      }
    },
    {
      label: 'Align center',
      type: 'Item',
      icon: AlignCenter,
      action: () => {
        if (options.target === 'column') {
          editor.commands.setColumnStyle(
            options.props.columnIndex,
            options.props.tablePos,
            {
              textAlign: 'center'
            }
          )
        } else if (options.target === 'row') {
          editor.commands.setRowStyle(
            options.props.rowIndex,
            options.props.tablePos,
            {
              textAlign: 'center'
            }
          )
        } else if (options.target === 'table') {
          editor.commands.styleTable(
            options.props.pos,
            {
              textAlign: 'center'
            }
          )
        } else if (options.target === 'cell') {
          editor.commands.styleCell(
            options.props.pos,
            {
              textAlign: 'center'
            }
          )
        }
      }
    },
    {
      label: 'Align justify',
      type: 'Item',
      icon: AlignJustify,
      action: () => {
        if (options.target === 'column') {
          editor.commands.setColumnStyle(
            options.props.columnIndex,
            options.props.tablePos,
            {
              textAlign: 'justify'
            }
          )
        } else if (options.target === 'row') {
          editor.commands.setRowStyle(
            options.props.rowIndex,
            options.props.tablePos,
            {
              textAlign: 'justify'
            }
          )
        } else if (options.target === 'table') {
          editor.commands.styleTable(
            options.props.pos,
            {
              textAlign: 'justify'
            }
          )
        } else if (options.target === 'cell') {
          editor.commands.styleCell(
            options.props.pos,
            {
              textAlign: 'justify'
            }
          )
        }
      }
    }
  ]
}