import { useState } from "react";
import { Plus } from "lucide-react";
import type { DatabaseProperty } from "src/types";

const EMPTY_PLACEHOLDER_ROWS = 3;

export function TablePlaceholder({
  visibleProperties,
  gridTemplateColumns,
  onNewRecord,
}: {
  visibleProperties: DatabaseProperty[];
  gridTemplateColumns: string;
  onNewRecord: () => void;
}) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div className="db-table__placeholder" contentEditable={false}>
      {Array.from({ length: EMPTY_PLACEHOLDER_ROWS }).map((_, row) => (
        <div
          key={row}
          className="db-table__placeholder-row"
          onMouseEnter={() => setHoveredRow(row)}
          onMouseLeave={() => setHoveredRow((r) => (r === row ? null : r))}
          onClick={onNewRecord}
          style={{ display: "grid", gridTemplateColumns, cursor: "pointer" }}
        >
          {visibleProperties.map((prop, col) =>
            hoveredRow === row && col === 0 ? (
              <div key={prop.id} className="db-table__placeholder-cell">
                <span className="db-table__placeholder-new">
                  <Plus className="tiptap-button-icon" size={15} />
                  <span className="tiptap-button-text">New page</span>
                </span>
              </div>
            ) : (
              <div key={prop.id} className="db-table__placeholder-cell" />
            ),
          )}
          <div className="db-table__placeholder-cell db-table__placeholder-cell--trailing" />
        </div>
      ))}
    </div>
  );
}
