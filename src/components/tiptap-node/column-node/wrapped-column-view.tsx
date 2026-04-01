import { ResizableNodeProvider } from "../figure-node";
import ColumnView from "./column-view";
import type { ReactNodeViewProps } from "@tiptap/react";

export function WrappedColumnView(props: ReactNodeViewProps) {
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
    >
      <ColumnView {...props} />
    </ResizableNodeProvider>
  );
}
