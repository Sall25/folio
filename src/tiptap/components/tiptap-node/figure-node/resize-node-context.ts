import { createContext, useContext } from "react";
import type { ResizableNodeContextType } from "./types";

export const ResizableNodeContext = createContext<ResizableNodeContextType>({
  isResizing: false,
  activeHandle: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  elementDimensions: { width: 0, height: 0, offsetWidth: 0, offsetHeight: 0 },
  aspectRatio: 1,
  nodeRef: null
});

export function useResizableNode() {
  const ctx = useContext(ResizableNodeContext);
  return ctx;
}
