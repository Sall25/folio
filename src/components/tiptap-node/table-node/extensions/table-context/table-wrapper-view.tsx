import {
  NodeViewWrapper,
  NodeViewContent,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { TableOverlays } from "../../ui/table-overlays";
import { useHoverMenu } from "src/components/tiptap-ui/color-dropdown-menu/useHoverMenu";
import { tableContextPluginKey } from "./table-context-plugin";
import { useEditorState } from "@tiptap/react";

import "./table-wrapper-view.scss";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ColorDropdownProvider } from "src/components/tiptap-ui/color-dropdown-menu/color-dropdown-provider";

export function TableWrapperView(props: ReactNodeViewProps) {
  const { editor, getPos, selected, deleteNode } = props;
  const tablePos = getPos()! + 1;

  const { open, handleMouseEnter, handleMouseLeave } = useHoverMenu();
  const isLocked = useEditorState({
    editor,
    selector: (ctx) =>
      (tableContextPluginKey.getState(ctx.editor.state)?.isLocked &&
        tablePos ===
          tableContextPluginKey.getState(ctx.editor.state)?.tablePos) ??
      false,
  });

  const showOverlays = open || isLocked;

  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (showOverlays) {
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    } else {
      rafRef.current = requestAnimationFrame(() => setVisible(false));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [showOverlays]);

  return (
    <NodeViewWrapper
      style={{
        width: "100%",
        // display: "contents",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ColorDropdownProvider>
        <div style={{ position: "relative" }} className="table-overlays">
          {showOverlays && (
            <TableOverlays
              className={clsx("table-overlays-fade", {
                "table-overlays-fade--visible": visible,
              })}
              // showOverlays={showOverlays}
              tablePos={tablePos}
              editor={editor}
            />
          )}
          <NodeViewContent data-selected={selected} />
        </div>
      </ColorDropdownProvider>
    </NodeViewWrapper>
  );
}
