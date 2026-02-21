type TableCommand =
  | { action: 'clearTableContent', options?: { pos: number } }
  | { action: 'fitTableWidth', options?: { pos: number } }
  | { action: 'selectTable', options?: { pos: number } }
  | { action: 'setTableColor', options?: { pos: number; color: string; target: 'text' | 'highlight' } }
  | { action: 'setTableStyle', options?: { pos: number; styles: Partial<CSSStyleDeclaration> } }

export type TableContext = {
  pos: number | null,
  pendingCommand: TableCommand | null
}