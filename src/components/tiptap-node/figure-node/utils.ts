import type { ResizeNodeDimensions, ResizeNodeDirection } from "./types";

/**
   * Calculates new dimensions based on mouse delta and resize direction.
   *
   * Takes the starting dimensions and applies the mouse movement delta
   * according to the handle direction. For corner handles, both dimensions
   * are affected. For edge handles, only one dimension changes. If aspect
   * ratio should be preserved, delegates to applyAspectRatio.
   *
   * @param direction - The active resize handle direction
   * @param deltaX - Horizontal mouse movement since resize start
   * @param deltaY - Vertical mouse movement since resize start
   * @returns The calculated width and height
   */
// type CalculateNewDimensionParams={
//   startWidth: number
//   startHeight: number
//   direction: ResizeNodeDirection
//   deltaX: number
//   deltaY: number
  

// }
// function calculateNewDimensions(
//     direction: ResizableNodeViewDirection,
//     deltaX: number,
//     deltaY: number,
//   ): ResizableNodeDimensions {
//     let newWidth = this.startWidth
//     let newHeight = this.startHeight

//     const isRight = direction.includes('right')
//     const isLeft = direction.includes('left')
//     const isBottom = direction.includes('bottom')
//     const isTop = direction.includes('top')

//     // Apply horizontal delta
//     if (isRight) {
//       newWidth = this.startWidth + deltaX
//     } else if (isLeft) {
//       newWidth = this.startWidth - deltaX
//     }

//     // Apply vertical delta
//     if (isBottom) {
//       newHeight = this.startHeight + deltaY
//     } else if (isTop) {
//       newHeight = this.startHeight - deltaY
//     }

//     // For pure horizontal/vertical handles, only one dimension changes
//     if (direction === 'right' || direction === 'left') {
//       newWidth = this.startWidth + (isRight ? deltaX : -deltaX)
//     }

//     if (direction === 'top' || direction === 'bottom') {
//       newHeight = this.startHeight + (isBottom ? deltaY : -deltaY)
//     }

//     const shouldPreserveAspectRatio = this.preserveAspectRatio || this.isShiftKeyPressed

//     if (shouldPreserveAspectRatio) {
//       return this.applyAspectRatio(newWidth, newHeight, direction)
//     }

//     return { width: newWidth, height: newHeight }
//   }


/**
 * Applies min/max constraints to dimensions.
 *
 * When aspect ratio is NOT preserved, constraints are applied independently
 * to width and height. When aspect ratio IS preserved, constraints are
 * applied while maintaining the aspect ratio—if one dimension hits a limit,
 * the other is recalculated proportionally.
 *
 * This ensures that aspect ratio is never broken when constrained.
 *
 * @param width - The unconstrained width
 * @param height - The unconstrained height
 * @param preserveAspectRatio - Whether to maintain aspect ratio while constraining
 * @returns The constrained dimensions
 */
type ApplyConstraintsParams = {
  width: number;
  height: number;
  aspectRatio: number;
  preserveAspectRatio: boolean;
  minSize: ResizeNodeDimensions;
  maxSize: Partial<ResizeNodeDimensions>;
};
export function applyConstraints({
  width,
  height,
  preserveAspectRatio,
  maxSize,
  minSize,
  aspectRatio,
}: ApplyConstraintsParams): ResizeNodeDimensions {
  if (!preserveAspectRatio) {
    // Independent constraints for each dimension
    let constrainedWidth = Math.max(minSize.width, width);
    let constrainedHeight = Math.max(minSize.height, height);

    if (maxSize?.width) {
      constrainedWidth = Math.min(maxSize.width, constrainedWidth);
    }

    if (maxSize?.height) {
      constrainedHeight = Math.min(maxSize.height, constrainedHeight);
    }

    return { width: constrainedWidth, height: constrainedHeight };
  }

  // Aspect-ratio-aware constraints: adjust both dimensions proportionally
  let constrainedWidth = width;
  let constrainedHeight = height;

  // Check minimum constraints
  if (constrainedWidth < minSize.width) {
    constrainedWidth = minSize.width;
    constrainedHeight = constrainedWidth / aspectRatio;
  }

  if (constrainedHeight < minSize.height) {
    constrainedHeight = minSize.height;
    constrainedWidth = constrainedHeight * aspectRatio;
  }

  // Check maximum constraints
  if (maxSize?.width && constrainedWidth > maxSize.width) {
    constrainedWidth = maxSize.width;
    constrainedHeight = constrainedWidth / aspectRatio;
  }

  if (maxSize?.height && constrainedHeight > maxSize.height) {
    constrainedHeight = maxSize.height;
    constrainedWidth = constrainedHeight * aspectRatio;
  }

  return { width: constrainedWidth, height: constrainedHeight };
}

/**
 * Adjusts dimensions to maintain the original aspect ratio.
 *
 * For horizontal handles (left/right), uses width as the primary dimension
 * and calculates height from it. For vertical handles (top/bottom), uses
 * height as primary and calculates width. For corner handles, uses width
 * as the primary dimension.
 *
 * @param width - The new width
 * @param height - The new height
 * @param direction - The active resize direction
 * @returns Dimensions adjusted to preserve aspect ratio
 */
type ApplyAspectRatioParams = Pick<
  ApplyConstraintsParams,
  "width" | "height" | "aspectRatio"
> & { direction: ResizeNodeDirection };
export function applyAspectRatio({
  width,
  height,
  aspectRatio,
  direction,
}: ApplyAspectRatioParams): ResizeNodeDimensions {
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
}
