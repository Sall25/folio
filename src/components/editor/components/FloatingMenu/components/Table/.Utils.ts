/* eslint-disable @typescript-eslint/no-explicit-any */

import { Editor } from '@tiptap/react'
import { findTable, TableMap } from 'prosemirror-tables'

export function getColumnFromCoords(editor: Editor, x: number, y: number) {
  const pos = editor.view.posAtCoords({ left: x, top: y })
  if (!pos) return null

  const $pos = editor.state.doc.resolve(pos.pos)
  const table = findTable($pos)
  if (!table) return null

  const map = TableMap.get(table.node)
  const cellPos = $pos.pos - table.start
  const rect = map.findCell(cellPos)

  return {
    tableNode: table.node,
    tableStart: table.start,
    colIndex: rect.left,
  }
}

export function getHeaderDomForColumn(editor: Editor, colIndex: number, tableNode: any, tableStart: number) {
  const map = TableMap.get(tableNode)
  const headerCellPos = map.positionAt(0, colIndex, tableNode)
  const headerDocPos = tableStart + headerCellPos
  return editor.view.nodeDOM(headerDocPos) as HTMLElement | null
}
