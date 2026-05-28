"use client";

import { forwardRef } from "react";
import { cn } from "src/lib/tiptap-utils";
import "./grid.scss";

// ─── Grid ─────────────────────────────────────────────────────────────────────

export interface GridProps extends React.ComponentProps<"div"> {
  columns: string;
  rows?: string;
  gap?: string | number;
}

const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, columns, rows, gap, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("tt-grid", className)}
      style={
        {
          "--tt-grid-columns": columns,
          "--tt-grid-rows": rows,
          "--tt-grid-gap": typeof gap === "number" ? `${gap}px` : gap,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  ),
);
Grid.displayName = "Grid";

// ─── GridRow ──────────────────────────────────────────────────────────────────

const GridRow = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("tt-grid__row", className)} {...props} />
  ),
);
GridRow.displayName = "GridRow";

// ─── GridCell ─────────────────────────────────────────────────────────────────

export interface GridCellProps extends React.ComponentProps<"div"> {
  colSpan?: number;
  rowSpan?: number;
}

const GridCell = forwardRef<HTMLDivElement, GridCellProps>(
  ({ className, colSpan, rowSpan, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("tt-grid__cell", className)}
      style={{
        ...(colSpan ? { gridColumn: `span ${colSpan}` } : {}),
        ...(rowSpan ? { gridRow: `span ${rowSpan}` } : {}),
        ...style,
      }}
      {...props}
    />
  ),
);
GridCell.displayName = "GridCell";

// ─── GridHeader ───────────────────────────────────────────────────────────────

const GridHeader = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("tt-grid__header", className)} {...props} />
  ),
);
GridHeader.displayName = "GridHeader";

// ─── GridHeaderCell ───────────────────────────────────────────────────────────

const GridHeaderCell = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("tt-grid__header-cell", className)}
      {...props}
    />
  ),
);
GridHeaderCell.displayName = "GridHeaderCell";

// ─── GridBody ─────────────────────────────────────────────────────────────────

const GridBody = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("tt-grid__body", className)} {...props} />
  ),
);
GridBody.displayName = "GridBody";

// ─── GridFooter ───────────────────────────────────────────────────────────────

const GridFooter = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("tt-grid__footer", className)} {...props} />
  ),
);
GridFooter.displayName = "GridFooter";

export {
  Grid,
  GridRow,
  GridCell,
  GridHeader,
  GridHeaderCell,
  GridBody,
  GridFooter,
};
