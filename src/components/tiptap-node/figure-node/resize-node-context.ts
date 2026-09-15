import { createContext, useContext, type RefObject } from "react";
import type { ResizableNodeContextType } from "./types";

const defaultNodeRef: RefObject<HTMLElement | null> = {
  current: null,
};

export const ResizableNodeContext = createContext<ResizableNodeContextType>({
  isResizing: false,
  activeHandle: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  // elementDimensions: { width: 0, height: 0, offsetWidth: 0, offsetHeight: 0 },
  aspectRatio: 1,
  nodeRef: defaultNodeRef,
});

export function useResizableNode() {
  const ctx = useContext(ResizableNodeContext);
  return ctx;
}
