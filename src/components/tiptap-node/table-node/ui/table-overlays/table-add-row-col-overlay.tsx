import { type ReactNode } from "react";
import { useTableOverlays } from "./use-table-overlays";

interface TableAddRowColOverlayProps {
  orientation?: "row" | "column";
  children: ReactNode;
  className?: string;
}

export function TableAddRowColOverlay({
  orientation,
  children,
  className,
}: TableAddRowColOverlayProps) {
  const { tableWidth, tableHeight, isLastCol, isLastRow } = useTableOverlays();

  if (tableWidth === 0 || tableHeight === 0) {
    return null;
  }

  return (
    <>
      {orientation === "row" && isLastRow && (
        <div
          className={className}
          style={{
            position: "absolute",
            width: `${tableWidth}px`,
            bottom: "-12px",
            marginLeft: "-20px",
          }}
        >
          {children}
        </div>
      )}
      {orientation === "column" && isLastCol && (
        <div
          className={className}
          style={{
            position: "absolute",
            height: `${tableHeight}px`,
            right: "-12px",
          }}
        >
          {children}
        </div>
      )}
    </>
  );
}
