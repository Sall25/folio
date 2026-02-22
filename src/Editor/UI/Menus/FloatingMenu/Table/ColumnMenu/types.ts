
export type SortOrder = "asc" | "desc"

export interface SortColumnOptions {
  columnIndex: number
  ord: SortOrder
  hasHeader?: boolean // default: true
}

export interface SelectColumnOptions {
  columnIndex: number
  tablePos: number
}

export type ColumnStyleProps = Partial<CSSStyleDeclaration>

export type ColumnCommand = | { action: 'sortColumn'; options?: { columnIndex: number; ord: SortOrder; hasHeader?: boolean } }
  | { action: 'selectColumn'; options?: { columnIndex: number; tablePos: number } }
  | { action: 'alignColumn'; options?: 'left' | 'right' | 'center' | 'justify' }
  | { action: 'setColumnStyle'; options?: ColumnStyleProps }
  | { action: 'clearColumnContent'; }
  | { action: 'deselectColumn' }


export type ColumnContext = { columnIndex: number; tablePos: number; pendingCommand: ColumnCommand | null }
