import { useCallback } from "react";
import { ResizableNodeProvider } from "../figure-node";
import ColumnView from "./column-view";
import type {
  ReactNodeViewProps,
  ResizableNodeDimensions,
} from "@tiptap/react";

export function WrappedColumnView(props: ReactNodeViewProps) {
  const onResizeEnd = useCallback(
    ({ width }: ResizableNodeDimensions) =>
      props.updateAttributes({ width: `${width}px` }),
    [props],
  );
  return (
    <ResizableNodeProvider
      min={{
        width: 10,
        height: 10,
      }}
      max={{
        width: 600,
        height: 600,
      }}
      onResizeEnd={onResizeEnd}
    >
      <ColumnView {...props} />
    </ResizableNodeProvider>
  );
}
