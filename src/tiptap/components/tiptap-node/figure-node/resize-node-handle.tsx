import type { ResizableNodeDirection } from "./types";

import "./resize-node-handle.scss";
import { useResizableNode } from "./resize-node-context";

interface ResizableNodeHandleProps {
  direction: ResizableNodeDirection;
}

export function ResizableNodeHandle({ direction }: ResizableNodeHandleProps) {
  const isTop = direction.includes("top");
  const isBottom = direction.includes("bottom");
  const isLeft = direction.includes("left");
  const isRight = direction.includes("right");

  const { handleResizeStart } = useResizableNode();

  return (
    <span
      className="resize-handle"
      data-top={isTop}
      data-bottom={isBottom}
      data-left={isLeft}
      data-right={isRight}
      data-direction={direction}
      onMouseDown={(event) => {
        handleResizeStart?.(event, direction);
      }}
      onTouchStart={(event) => {
        handleResizeStart?.(event, direction);
      }}
    />
  );
}
