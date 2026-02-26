import { TableMap } from "prosemirror-tables"
import { findParentNodeClosestToPos } from "@tiptap/react"
import type { EditorView } from "prosemirror-view"
import { Fragment, type Node as PMNode } from "prosemirror-model"

export function getTableContext(view: EditorView, event: MouseEvent) {
  const coords = { left: event.clientX, top: event.clientY }
  const pos = view.posAtCoords(coords)
  if (!pos) return null

  const $pos = view.state.doc.resolve(pos.pos)

  const cell = findParentNodeClosestToPos($pos, node =>
    node.type.name === "tableCell" || node.type.name === "tableHeader"
  )
  if (!cell) return null

  const table = findParentNodeClosestToPos($pos, node =>
    node.type.name === "table"
  )
  if (!table) return null

  return { cell, table }
}

export function getCellIndices(tableNode: PMNode, cellPos: number, tablePos: number) {
  const map = TableMap.get(tableNode)
  const cellPosInTable = cellPos - tablePos - 1
  const rect = map.findCell(cellPosInTable)

  return {
    map,
    columnIndex: rect.left,
    rowIndex: rect.top,
  }
}

export function getColumnWidthsFromTableDOM(
  tableEl: HTMLTableElement,
  colCount: number
): number[] {
  const widths: number[] = Array(colCount).fill(0)
  const firstRow = tableEl.rows[0]
  if (!firstRow) return widths

  let leftEdge = 0
  let logicalCol = 0

  for (const cell of Array.from(firstRow.cells)) {
    const el = cell as HTMLElement
    const rect = el.getBoundingClientRect()
    const colspan = Number(el.getAttribute("colspan") || 1)

    // divide cell width evenly among spanned columns
    const totalWidth = rect.width
    const widthPerCol = totalWidth / colspan

    for (let i = 0; i < colspan; i++) {
      if (logicalCol < colCount) {
        widths[logicalCol++] = widthPerCol
      }
    }

    leftEdge += totalWidth
  }

  return widths
}

// Helper: compute row DOMRect
export function getRowDOMRect(
  map: TableMap,
  tableStart: number,
  rowIndex: number,
  view: EditorView
): DOMRect | null {
  const seen = new Set<number>()
  const cells: DOMRect[] = []

  for (let col = 0; col < map.width; col++) {
    const cellIndex = rowIndex * map.width + col
    const cellPos = map.map[cellIndex]

    if (seen.has(cellPos)) continue
    seen.add(cellPos)

    const pos = tableStart + cellPos + 1
    const dom = view.nodeDOM(pos) as HTMLElement | null
    if (!dom) continue

    cells.push(dom.getBoundingClientRect())
  }

  if (cells.length === 0) return null

  const left = Math.min(...cells.map(c => c.left))
  const right = Math.max(...cells.map(c => c.right))
  const top = Math.min(...cells.map(c => c.top))
  const bottom = Math.max(...cells.map(c => c.bottom))


  return new DOMRect(
    left,
    top,
    right - left,
    bottom - top
  )
}


// Helper: compute column DOMRect
export function getColumnDOMRect(map: TableMap, tableStart: number, columnIndex: number, view: EditorView): DOMRect | null {
  const seen = new Set<number>()
  const domRects: DOMRect[] = []

  for (let row = 0; row < map.height; row++) {
    const index = row * map.width + columnIndex
    const offset = map.map[index]

    if (seen.has(offset)) continue // skip duplicates from rowspan
    seen.add(offset)

    const pos = tableStart + offset + 1
    const dom = view.nodeDOM(pos) as HTMLElement | null
    if (!dom) continue

    domRects.push(dom.getBoundingClientRect())
  }

  if (domRects.length === 0) return null

  const left = Math.min(...domRects.map(r => r.left))
  const top = Math.min(...domRects.map(r => r.top))
  const right = Math.max(...domRects.map(r => r.right))
  const bottom = Math.max(...domRects.map(r => r.bottom))

  return new DOMRect(left, top, right - left, bottom - top)
}


export function getEdgeFlags(map: TableMap, columnIndex: number, rowIndex: number) {
  return {
    isLastColumn: columnIndex === map.width - 1,
    isLastRow: rowIndex === map.height - 1,
  }
}

export function getRowStart(tableNode: PMNode, tablePos: number, rowIndex: number) {
  let rowStart = tablePos + 1
  for (let i = 0; i < rowIndex; i++) {
    rowStart += tableNode.child(i).nodeSize
  }
  return rowStart
}

export function getHeaderCellRect(
  view: EditorView,
  tableNode: PMNode,
  tablePos: number,
  columnIndex: number
) {
  const firstRow = tableNode.firstChild
  if (!firstRow) return null

  let col = 0
  let headerCellPos: number | null = null

  for (let i = 0; i < firstRow.childCount; i++) {
    const cellNode = firstRow.child(i)
    const colspan = cellNode.attrs.colspan || 1

    if (columnIndex >= col && columnIndex < col + colspan) {
      const rowStart = tablePos + 1
      let offset = 0
      for (let j = 0; j < i; j++) {
        offset += firstRow.child(j).nodeSize
      }
      headerCellPos = rowStart + 1 + offset
      break
    }
    col += colspan
  }

  if (headerCellPos == null) return null

  const dom = view.nodeDOM(headerCellPos) as HTMLElement | null
  return dom?.getBoundingClientRect() ?? null
}

export function getRowRect(view: EditorView, rowStart: number) {
  const rowDOM = view.nodeDOM(rowStart) as HTMLElement | null
  return rowDOM?.getBoundingClientRect() ?? null
}

export function getRowNode(tableNode: PMNode, rowIndex: number) {
  return tableNode.child(rowIndex) // table → row
}

export function getRowRange(tablePos: number, tableNode: PMNode, rowIndex: number) {
  let offset = 0

  for (let i = 0; i < rowIndex; i++) {
    offset += tableNode.child(i).nodeSize
  }

  const rowNode = tableNode.child(rowIndex)
  const rowStart = tablePos + 1 + offset
  const rowEnd = rowStart + rowNode.nodeSize

  return { rowStart, rowEnd }
}

export function getColumnCellRanges(tableNode: PMNode, tablePos: number, columnIndex: number) {
  const map = TableMap.get(tableNode)
  const decorations: { from: number; to: number }[] = []

  for (let row = 0; row < map.height; row++) {
    const cellIndex = row * map.width + columnIndex
    const cellPos = map.map[cellIndex]

    // Skip merged cells duplicates
    if (row > 0) {
      const prevCellPos = map.map[(row - 1) * map.width + columnIndex]
      if (prevCellPos === cellPos) continue
    }

    const from = tablePos + 1 + cellPos
    const cellNode = tableNode.nodeAt(cellPos)
    if (!cellNode) continue

    const to = from + cellNode.nodeSize

    decorations.push({ from, to })
  }

  return decorations
}




/* -------------------------
   Column Operations
------------------------- */

// Get all cells in a column
export function getColumnCells(tableNode: PMNode, tablePos: number, columnIndex: number) {
  const map = TableMap.get(tableNode)
  const cells: { pos: number; node: PMNode }[] = []

  for (let row = 0; row < map.height; row++) {
    const cellIndex = row * map.width + columnIndex
    const cellPosInMap = map.map[cellIndex]

    if (row > 0 && map.map[(row - 1) * map.width + columnIndex] === cellPosInMap)
      continue // skip duplicates from rowspan

    const from = tablePos + 1 + cellPosInMap
    const node = tableNode.nodeAt(cellPosInMap)
    if (node) cells.push({ pos: from, node })
  }

  return cells
}

// Clear a column's content
export function clearColumn(view: EditorView, tablePos: number, tableNode: PMNode, columnIndex: number) {
  const tr = view.state.tr
  const cells = getColumnCells(tableNode, tablePos, columnIndex)

  cells.forEach(({ pos, node }) => {
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, Fragment.empty)
  })

  view.dispatch(tr)
}

// Duplicate a column
export function duplicateColumn(view: EditorView, tablePos: number, tableNode: PMNode, columnIndex: number) {
  const tr = view.state.tr
  const cells = getColumnCells(tableNode, tablePos, columnIndex)
  // const tableType = tableNode.type

  cells.forEach(({ pos, node }) => {
    const newNode = node.type.create(node.attrs, node.content, node.marks)
    tr.insert(pos + node.nodeSize, newNode)
  })

  view.dispatch(tr)
}

// Get a specific row's cells
export function getRowCells(tableNode: PMNode, tablePos: number, rowIndex: number) {
  const rowNode = tableNode.child(rowIndex)
  let pos = tablePos + 1
  for (let i = 0; i < rowIndex; i++) pos += tableNode.child(i).nodeSize

  const cells: { pos: number; node: PMNode }[] = []
  let offset = 0
  rowNode.forEach((cell) => {
    cells.push({ pos: pos + 1 + offset, node: cell })
    offset += cell.nodeSize
  })

  return cells
}

// Clear a row's content
export function clearRow(view: EditorView, tablePos: number, tableNode: PMNode, rowIndex: number) {
  const tr = view.state.tr
  const cells = getRowCells(tableNode, tablePos, rowIndex)
  cells.forEach(({ pos, node }) => {
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, Fragment.empty)
  })
  view.dispatch(tr)
}

// Duplicate a row
export function duplicateRow(view: EditorView, tablePos: number, tableNode: PMNode, rowIndex: number) {
  const tr = view.state.tr
  const rowNode = tableNode.child(rowIndex)
  const rowPos = getRowRange(tablePos, tableNode, rowIndex).rowStart
  const newRow = rowNode.type.create(rowNode.attrs, rowNode.content, rowNode.marks)
  tr.insert(rowPos + rowNode.nodeSize, newRow)
  view.dispatch(tr)
}

// Move a row up or down
export function moveRow(view: EditorView, tablePos: number, tableNode: PMNode, rowIndex: number, direction: "up" | "down") {
  const targetIndex = direction === "up" ? rowIndex - 1 : rowIndex + 1
  if (targetIndex < 0 || targetIndex >= tableNode.childCount) return

  const tr = view.state.tr
  const rowRange = getRowRange(tablePos, tableNode, rowIndex)
  const targetRange = getRowRange(tablePos, tableNode, targetIndex)

  const rowNode = tableNode.child(rowIndex)
  const targetNode = tableNode.child(targetIndex)

  tr.replaceWith(targetRange.rowStart, targetRange.rowEnd, rowNode)
  tr.replaceWith(rowRange.rowStart, rowRange.rowEnd, targetNode)

  view.dispatch(tr)
}

/* -------------------------
   Sorting
------------------------- */

// Sort a column ascending or descending
export function sortColumn(view: EditorView, tablePos: number, tableNode: PMNode, columnIndex: number, direction: "asc" | "desc") {
  const tr = view.state.tr
  const map = TableMap.get(tableNode)
  const rows: { node: PMNode; rowStart: number }[] = []

  for (let r = 0; r < map.height; r++) {
    const { rowStart } = getRowRange(tablePos, tableNode, r)
    const rowNode = tableNode.child(r)
    rows.push({ node: rowNode, rowStart })
  }

  // Extract sortable data
  const rowsWithValues = rows.map((row) => {
    const cellIndex = row.node.child(columnIndex)
    let value = ""
    if (cellIndex) {
      value = cellIndex.textContent ?? ""
    }
    return { row, value }
  })

  // Sort
  rowsWithValues.sort((a, b) => {
    if (direction === "asc") return a.value.localeCompare(b.value)
    else return b.value.localeCompare(a.value)
  })

  // Rebuild rows
  rowsWithValues.forEach((rowValue) => {
    // const currentRow = tableNode.child(i)
    tr.replaceWith(rowValue.row.rowStart, rowValue.row.rowStart + rowValue.row.node.nodeSize, rowValue.row.node)
  })

  view.dispatch(tr)
}

// Sort a row horizontally (swap cells)
export function sortRow(view: EditorView, tablePos: number, tableNode: PMNode, rowIndex: number, direction: "asc" | "desc") {
  const tr = view.state.tr
  const rowNode = tableNode.child(rowIndex)
  const rowRange = getRowRange(tablePos, tableNode, rowIndex)

  const cellsWithValues: ({ node: PMNode, value: string })[] = []
  rowNode.content.forEach(cell => {
    cellsWithValues.push({
      node: cell,
      value: cell.textContent
    })
  })

  cellsWithValues.sort((a, b) => {
    if (direction === "asc") return a.value.localeCompare(b.value)
    else return b.value.localeCompare(a.value)
  })

  const newRow = rowNode.type.create(rowNode.attrs, Fragment.fromArray(cellsWithValues.map(c => c.node)))
  tr.replaceWith(rowRange.rowStart, rowRange.rowEnd, newRow)
  view.dispatch(tr)
}

/* -------------------------
   Cell Styling
------------------------- */

export function setCellColor(view: EditorView, tablePos: number, tableNode: PMNode, columnIndex?: number, rowIndex?: number, bgColor?: string, fgColor?: string) {
  const tr = view.state.tr

  if (columnIndex != null) {
    getColumnCells(tableNode, tablePos, columnIndex).forEach(({ pos, node }) => {
      const attrs = { ...node.attrs }
      if (bgColor) attrs.background = bgColor
      if (fgColor) attrs.color = fgColor
      tr.setNodeMarkup(pos, undefined, attrs)
    })
  } else if (rowIndex != null) {
    getRowCells(tableNode, tablePos, rowIndex).forEach(({ pos, node }) => {
      const attrs = { ...node.attrs }
      if (bgColor) attrs.background = bgColor
      if (fgColor) attrs.color = fgColor
      tr.setNodeMarkup(pos, undefined, attrs)
    })
  }

  view.dispatch(tr)
}