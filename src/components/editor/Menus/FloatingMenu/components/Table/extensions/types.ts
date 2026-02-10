
export type SortDirection = "asc" | "desc"

export interface SortColumnOptions {
  columnIndex: number
  direction: SortDirection
  hasHeader?: boolean // default: true
}

export interface SortRowOptions {
  rowIndex: number
  direction: SortDirection
}

export interface SelectColumnOptions {
  columnIndex: number
  tablePos: number
}

export interface SelectRowOptions {
  rowIndex: number
  tablePos: number
}

export type ColumnStyleProps = Partial<CSSStyleDeclaration>

export type RowStyleProps = Partial<CSSStyleDeclaration>