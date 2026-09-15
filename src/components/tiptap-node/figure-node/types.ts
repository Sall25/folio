import type { RefObject } from "react";

export type ResizableNodeDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";
export type ResizableNodeDimensions = Record<"width" | "height", number>;
export type ElementDimensions = Record<
  "offsetWidth" | "offsetHeight" | "width" | "height",
  number
>;

export type ResizableNodeContextType = {
  isResizing: boolean;
  activeHandle: ResizableNodeDirection | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
  nodeRef: RefObject<HTMLElement | null>;
  handleResizeStart?: (
    event: React.MouseEvent | React.TouchEvent,
    direction: ResizableNodeDirection,
  ) => void;
  // elementDimensions: ElementDimensions;
};

export type FigureNodeViewOptions = {
  directions?: ResizableNodeDirection[];
  min?: Partial<ResizableNodeDimensions>;
  max?: Partial<ResizableNodeDimensions>;
  preserveAspectRatio?: boolean;
};
