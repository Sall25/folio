import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { ResizableNodeDimensions, ResizableNodeDirection } from "./types";
import { ResizableNodeContext } from "./resize-node-context";

const isTouchEvent = (e: MouseEvent | TouchEvent): e is TouchEvent => {
  return "touches" in e;
};

interface ResizableNodeProviderProps {
  children: ReactNode;
  min?: Partial<ResizableNodeDimensions>;
  max?: Partial<ResizableNodeDimensions>;
  shouldPreserveAspectRatio?: boolean;
  onResizeEnd?: (
    dimensions: ResizableNodeDimensions,
    ref?: RefObject<HTMLElement | null>,
  ) => void;
}

export function ResizableNodeProvider({
  children,
  min,
  max,
  shouldPreserveAspectRatio = false,
  onResizeEnd,
}: ResizableNodeProviderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] =
    useState<ResizableNodeDirection | null>(null);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(0);
  const preserveAspectRatio = useRef(shouldPreserveAspectRatio);
  const minSize = useRef<Partial<ResizableNodeDimensions> | undefined | null>(
    min,
  );
  const maxSize = useRef<Partial<ResizableNodeDimensions> | undefined | null>(
    max,
  );
  const isShiftKeyPressed = useRef(false);

  const nodeRef = useRef<HTMLElement | null>(null);

  const applyAspectRatio = useCallback(
    (
      width: number,
      height: number,
      direction: ResizableNodeDirection,
    ): ResizableNodeDimensions => {
      const isHorizontal = direction === "left" || direction === "right";
      const isVertical = direction === "top" || direction === "bottom";

      if (isHorizontal) {
        // For horizontal resize, width is primary
        return {
          width,
          height: width / aspectRatio,
        };
      }

      if (isVertical) {
        // For vertical resize, height is primary
        return {
          width: height * aspectRatio,
          height,
        };
      }

      // For corner resize, width is primary
      return {
        width,
        height: width / aspectRatio,
      };
    },
    [aspectRatio],
  );

  const applyConstraints = useCallback(
    (
      width: number,
      height: number,
      preserveAspectRatio: boolean,
    ): ResizableNodeDimensions => {
      if (!preserveAspectRatio) {
        let constrainedWidth = Math.max(minSize.current?.width ?? 0, width);
        let constrainedHeight = Math.max(minSize.current?.height ?? 0, height);

        if (maxSize.current?.width) {
          constrainedWidth = Math.min(maxSize.current.width, constrainedWidth);
        }

        if (maxSize.current?.height) {
          constrainedHeight = Math.min(
            maxSize.current.height,
            constrainedHeight,
          );
        }

        return { width: constrainedWidth, height: constrainedHeight };
      }

      // Aspect-ratio-aware constraints: adjust both dimensions proportionally
      let constrainedWidth = width;
      let constrainedHeight = height;

      // Check minimum constraints
      if (
        minSize.current &&
        minSize.current.width &&
        constrainedWidth < minSize.current.width
      ) {
        constrainedWidth = minSize.current.width;
        constrainedHeight = constrainedWidth / aspectRatio;
      }

      if (
        minSize.current &&
        minSize.current.height &&
        constrainedHeight < minSize.current.height
      ) {
        constrainedHeight = minSize.current.height;
        constrainedWidth = constrainedHeight * aspectRatio;
      }

      // Check maximum constraints
      if (maxSize.current?.width && constrainedWidth > maxSize.current.width) {
        constrainedWidth = maxSize.current.width;
        constrainedHeight = constrainedWidth / aspectRatio;
      }

      if (
        maxSize.current?.height &&
        constrainedHeight > maxSize.current.height
      ) {
        constrainedHeight = maxSize.current.height;
        constrainedWidth = constrainedHeight * aspectRatio;
      }

      return { width: constrainedWidth, height: constrainedHeight };
    },
    [aspectRatio],
  );

  const calculateNewDimensions = useCallback(
    (
      direction: ResizableNodeDirection,
      deltaX: number,
      deltaY: number,
    ): ResizableNodeDimensions => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      const isRight = direction.includes("right");
      const isLeft = direction.includes("left");
      const isBottom = direction.includes("bottom");
      const isTop = direction.includes("top");

      // Apply horizontal delta
      if (isRight) {
        newWidth = startWidth + deltaX;
      } else if (isLeft) {
        newWidth = startWidth - deltaX;
      }

      // Apply vertical delta
      if (isBottom) {
        newHeight = startHeight + deltaY;
      } else if (isTop) {
        newHeight = startHeight - deltaY;
      }

      // For pure horizontal/vertical handles, only one dimension changes
      if (direction === "right" || direction === "left") {
        newWidth = startWidth + (isRight ? deltaX : -deltaX);
      }

      if (direction === "top" || direction === "bottom") {
        newHeight = startHeight + (isBottom ? deltaY : -deltaY);
      }

      const shouldPreserveAspectRatio =
        preserveAspectRatio.current || isShiftKeyPressed.current;

      if (shouldPreserveAspectRatio) {
        return applyAspectRatio(newWidth, newHeight, direction);
      }

      return { width: newWidth, height: newHeight };
    },
    [startWidth, startHeight, applyAspectRatio],
  );

  const frameRef = useRef<number | null>(null);

  const handleResize = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!activeHandle) return;

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        const shouldPreserveAspectRatio =
          preserveAspectRatio.current || isShiftKeyPressed.current;

        const { width, height } = calculateNewDimensions(
          activeHandle,
          deltaX,
          deltaY,
        );

        const constrained = applyConstraints(
          width,
          height,
          shouldPreserveAspectRatio,
        );
        if (nodeRef.current) {
          // const isHorizontal =
          //   activeHandle === "left" || activeHandle === "right";

          // if (!isHorizontal) {
          //   nodeRef.current.style.height = `${constrained.height}px`;
          // }
          nodeRef.current.style.width = `${constrained.width}px`;
          nodeRef.current.style.flexBasis = `${constrained.width}px`;
        }

        // if (nodeRef.current) {
        //   nodeRef.current.style.width = `${constrained.width}px`;
        //   nodeRef.current.style.height = `${constrained.height}px`;
        //   nodeRef.current.style.flexBasis = `${constrained.width}px`;
        //   //  nodeRef.current.style.flexBasis = `${constrained.width}px`;
        // }
      });
    },
    [activeHandle, calculateNewDimensions, applyConstraints],
  );
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizing || !activeHandle) {
        return;
      }
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      handleResize(deltaX, deltaY);
    },
    [isResizing, activeHandle, handleResize, startX, startY],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!isResizing || !activeHandle) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      handleResize(deltaX, deltaY);
    },
    [isResizing, activeHandle, startX, startY, handleResize],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Shift") {
      isShiftKeyPressed.current = true;
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === "Shift") {
      isShiftKeyPressed.current = false;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;

    setIsResizing(false);
    setActiveHandle(null);

    // Write final dimensions back to caller
    if (nodeRef.current && onResizeEnd) {
      const width = nodeRef.current.offsetWidth;
      const height = nodeRef.current.offsetHeight;
      onResizeEnd({ width, height }, nodeRef);
    }
  }, [isResizing, onResizeEnd]);

  const handleResizeStart = useCallback(
    (
      event: React.MouseEvent | React.TouchEvent,
      direction: ResizableNodeDirection,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      setIsResizing(true);
      setActiveHandle(direction);

      const nativeEvent = event.nativeEvent;

      if (isTouchEvent(nativeEvent)) {
        setStartX(nativeEvent.touches[0].clientX);
        setStartY(nativeEvent.touches[0].clientY);
      } else {
        setStartX(nativeEvent.clientX);
        setStartY(nativeEvent.clientY);
      }

      const width = nodeRef.current?.offsetWidth;
      const height = nodeRef.current?.offsetHeight;

      setStartWidth(width ?? 0);
      setStartHeight(height ?? 0);

      if (width && height && width > 0 && height > 0) {
        setAspectRatio(width / height);
      }
    },
    [],
  );

  const cleanupListeners = useCallback(() => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
  }, [
    handleMouseMove,
    handleTouchMove,
    handleMouseUp,
    handleKeyDown,
    handleKeyUp,
  ]);

  useEffect(() => {
    if (!isResizing) return;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      cleanupListeners();
    };
  }, [
    isResizing,
    handleMouseMove,
    handleTouchMove,
    handleMouseUp,
    handleKeyDown,
    handleKeyUp,
    cleanupListeners,
  ]);

  return (
    <ResizableNodeContext.Provider
      value={{
        isResizing,
        activeHandle,
        startX,
        startY,
        startWidth,
        startHeight,
        aspectRatio,
        handleResizeStart,
        nodeRef,
      }}
    >
      {children}
    </ResizableNodeContext.Provider>
  );
}
