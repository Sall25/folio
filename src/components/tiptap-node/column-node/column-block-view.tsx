import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useRef } from "react";

export default function ColumnBlockView() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <NodeViewWrapper
      as="div"
      ref={wrapperRef}
      data-type="column-block"
      style={{ padding: "0px !important" }}
    >
      <div className="column-block-inner">
        <NodeViewContent as="div" className="column-block-columns" />
      </div>
    </NodeViewWrapper>
  );
}
