type CellCommand =
  | { action: 'selectCell', options?: { pos: number } }
  | { action: 'setCellStyle', options?: Partial<CSSStyleDeclaration> }
  | { action: 'clearCellContent', options?: Partial<CSSStyleDeclaration> }

export type CellContext = {
  pos: number;
  pendingCommand: CellCommand | null
}