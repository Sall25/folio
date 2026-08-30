"use client";

import { forwardRef } from "react";
import { cn } from "src/lib/tiptap-utils";
import "./board.scss";

// A "board" is one entity (a page, a catalog, a record) rendered as a surface.
// It has a fixed vocabulary of parts — cover, icon, controls, content, title,
// meta, actions — but the parts compose freely, so the same primitive renders a
// full page header, a grid card, a list row, etc. Nothing here is required:
// pick the parts a given form needs.
//
// Layout model: parts stack top-to-bottom. The cover clips its own image; the
// root does NOT clip, so BoardIcon can hang past the cover's edge. BoardIcon
// with `hang` is pulled up by a negative margin to straddle the cover/content
// seam (the page-header look); without `hang` it sits inline in the content
// flow (the card look).

// ─── Board ───────────────────────────────────────────────────────────────────
// Root surface. `variant="card"` gives border + background + radius; `"plain"`
// strips all chrome (page-header use). `interactive` toggles hover + pointer.

type BoardVariant = "card" | "plain";

const Board = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    variant?: BoardVariant;
    interactive?: boolean;
  }
>(
  (
    { className, variant = "card", interactive = variant === "card", ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn("tiptap-board", className)}
        data-variant={variant}
        data-interactive={interactive || undefined}
        {...props}
      />
    );
  },
);
Board.displayName = "Board";

// ─── BoardCover ──────────────────────────────────────────────────────────────
// Top band. Holds an image, gradient, or solid color, plus positioned overlays
// (BoardControls). Clips its own contents so the image respects the top radius.

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

// ─── BoardCoverImage ─────────────────────────────────────────────────────────
// Convenience <img> that fills the cover (object-fit: cover). Optional — a bare
// <img>, <video>, or a gradient/color via BoardCover style works too.

const BoardCoverImage = forwardRef<
  HTMLImageElement,
  React.ComponentProps<"img">
>(({ className, alt = "", ...props }, ref) => {
  return (
    <img
      ref={ref}
      className={cn("tiptap-board-cover-image", className)}
      alt={alt}
      {...props}
    />
  );
});
BoardCoverImage.displayName = "BoardCoverImage";

// ─── BoardControls ───────────────────────────────────────────────────────────
// Overlay cluster pinned to a corner of the cover (Change / Reposition / …).
// Put your own buttons inside. `align` chooses the horizontal edge.

const BoardControls = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    align?: "start" | "end";
  }
>(({ className, align = "end", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("tiptap-board-controls", className)}
      data-align={align}
      {...props}
    />
  );
});
BoardControls.displayName = "BoardControls";

// ─── BoardIcon ───────────────────────────────────────────────────────────────
// The entity's icon (emoji, line icon, or small image as children). `hang`
// makes it straddle the cover's bottom edge — the page-header form; omit it to
// place the icon inline in the content flow — the card form. `size` sets the box
// (and emoji glyph). `align` positions a hanging icon along the cover.

const BoardIcon = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    size?: number;
    hang?: boolean;
    align?: "start" | "center" | "end";
  }
>(
  (
    { className, size = 64, hang = false, align = "start", style, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn("tiptap-board-icon", className)}
        data-hang={hang || undefined}
        data-align={align}
        style={
          {
            "--tt-board-icon-size": `${size}px`,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      />
    );
  },
);
BoardIcon.displayName = "BoardIcon";

// ─── BoardContent ────────────────────────────────────────────────────────────
// Lower body — title, meta, actions, or arbitrary children.

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

// ─── BoardTitle ──────────────────────────────────────────────────────────────

const BoardTitle = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("tiptap-board-title", className)}
        {...props}
      />
    );
  },
);
BoardTitle.displayName = "BoardTitle";

// ─── BoardMeta ───────────────────────────────────────────────────────────────
// Secondary line — "Edited 10m ago", counts, breadcrumbs.

const BoardMeta = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("tiptap-board-meta", className)}
        {...props}
      />
    );
  },
);
BoardMeta.displayName = "BoardMeta";

// ─── BoardActions ────────────────────────────────────────────────────────────
// Row for buttons/links at the bottom of the content.

const BoardActions = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("tiptap-board-actions", className)}
        {...props}
      />
    );
  },
);
BoardActions.displayName = "BoardActions";

// Named exports (matches the rest of the codebase) plus dot-notation access:
// either `<BoardCover/>` or `<Board.Cover/>` works.
const BoardRoot = Board as typeof Board & {
  Cover: typeof BoardCover;
  CoverImage: typeof BoardCoverImage;
  Controls: typeof BoardControls;
  Icon: typeof BoardIcon;
  Content: typeof BoardContent;
  Title: typeof BoardTitle;
  Meta: typeof BoardMeta;
  Actions: typeof BoardActions;
};
BoardRoot.Cover = BoardCover;
BoardRoot.CoverImage = BoardCoverImage;
BoardRoot.Controls = BoardControls;
BoardRoot.Icon = BoardIcon;
BoardRoot.Content = BoardContent;
BoardRoot.Title = BoardTitle;
BoardRoot.Meta = BoardMeta;
BoardRoot.Actions = BoardActions;

export {
  BoardRoot as Board,
  BoardCover,
  BoardCoverImage,
  BoardControls,
  BoardIcon,
  BoardContent,
  BoardTitle,
  BoardMeta,
  BoardActions,
};
