"use client";

import { forwardRef } from "react";
import { cn } from "src/lib/tiptap-utils";
import "./board.scss";

// ─── Board ────────────────────────────────────────────────────────────────────
// Root container — a card-like surface with a cover + content stacked vertically

const Board = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("tiptap-board", className)} {...props} />
    );
  },
);
Board.displayName = "Board";

// ─── BoardCover ───────────────────────────────────────────────────────────────
// Top area — accepts an image, gradient, or solid color via style/children

const BoardCover = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    height?: number;
  }
>(({ className, height = 120, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("tiptap-board-cover", className)}
      style={{ height, ...style }}
      {...props}
    />
  );
});
BoardCover.displayName = "BoardCover";

// ─── BoardContent ─────────────────────────────────────────────────────────────
// Bottom area — title, meta, actions

const BoardContent = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("tiptap-board-content", className)}
        {...props}
      />
    );
  },
);
BoardContent.displayName = "BoardContent";

export { Board, BoardCover, BoardContent };
