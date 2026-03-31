export function getColumnWidthsFromTableDOM(
  tableEl: HTMLTableElement,
  colCount: number,
): number[] {
  const widths: number[] = Array(colCount).fill(0);
  const firstRow = tableEl.rows[0];
  if (!firstRow) return widths;

  // let leftEdge = 0
  let logicalCol = 0;

  for (const cell of Array.from(firstRow.cells)) {
    const el = cell as HTMLElement;
    const rect = el.getBoundingClientRect();
    const colspan = Number(el.getAttribute("colspan") || 1);

    // divide cell width evenly among spanned columns
    const totalWidth = rect.width;
    const widthPerCol = totalWidth / colspan;

    for (let i = 0; i < colspan; i++) {
      if (logicalCol < colCount) {
        widths[logicalCol++] = widthPerCol;
      }
    }

    // leftEdge += totalWidth
  }

  return widths;
}
