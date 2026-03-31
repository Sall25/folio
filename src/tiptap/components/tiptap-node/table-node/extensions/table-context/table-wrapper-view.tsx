import {
  NodeViewWrapper,
  NodeViewContent,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { TableOverlays } from "../../ui/table-overlays";
import { useHoverMenu } from "@/components/tiptap-ui/color-dropdown-menu/useHoverMenu";
import { tableContextPluginKey } from "./table-context-plugin";
import { useEditorState } from "@tiptap/react";

import "./table-wrapper-view.scss";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ColorDropdownProvider } from "@/components/tiptap-ui/color-dropdown-menu/color-dropdown-provider";
import { NodeSelection } from "@tiptap/pm/state";

export function TableWrapperView(props: ReactNodeViewProps) {
  const { editor, getPos, selected } = props;
  const tablePos = getPos()! + 1;

  useEffect(() => {
    if (!selected) return;

    const pos = getPos();
    if (pos === undefined) return;

    const { state, dispatch } = editor.view;
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos + 1)));
  }, [selected, editor, getPos]);

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
      style={{ width: "100%" }}
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
