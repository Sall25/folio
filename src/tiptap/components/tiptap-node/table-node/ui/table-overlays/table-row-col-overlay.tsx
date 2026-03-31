import { type ReactNode } from "react";
import { useTableOverlays } from "./use-table-overlays";

interface TableRowColOverlayProps {
  orientation?: "row" | "column";
  children: ReactNode;
  className?: string;
}

export function TableRowColOverlay({
  orientation,
  children,
  className,
}: TableRowColOverlayProps) {
  const { left, top, width, height } = useTableOverlays();

  if (width === 0 || height === 0) return null;

  return (
    <>
      {orientation === "row" && (
        <div
          className={className}
          style={{
            top: `${top}px`,
            height: `${height}px`,
            left: "-16px",
            position: "absolute",
          }}
        >
          {children}
        </div>
      )}
      {orientation === "column" && (
        <div
          className={className}
          style={{
            left: `${left}px`,
            width: `${width}px`,
            top: "-16px",
            position: "absolute",
          }}
        >
          {children}
        </div>
      )}
    </>
  );
}
