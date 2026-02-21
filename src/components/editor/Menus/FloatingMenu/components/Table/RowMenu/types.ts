
export type SortOrder = "asc" | "desc"

export interface SortRowOptions {
  rowIndex: number
  ord: SortOrder
}

export interface SelectRowOptions {
  rowIndex: number
  tablePos: number
}

export type RowStyleProps = Partial<CSSStyleDeclaration>

export type RowCommand = | { action: 'sortRow'; options?: { rowIndex: number; ord: SortOrder } }
  | { action: 'selectRow'; options?: { rowIndex: number; tablePos: number } }
  | { action: 'alignRow'; options?: 'left' | 'right' | 'center' | 'justify' }
  | { action: 'setRowStyle'; options?: RowStyleProps }
  | { action: 'clearRowContent'; }
  | { action: 'deselectRow' }


export type RowContext = { rowIndex: number; tablePos: number; pendingCommand: RowCommand | null }
