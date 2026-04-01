import {
  type DragHandlePluginProps,
  defaultComputePositionConfig,
  DragHandlePlugin,
  dragHandlePluginDefaultKey,
} from "../drag-handle-extension";

import type { Node } from "@tiptap/pm/model";
import type { Plugin } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type DragHandleProps = Omit<
  Optional<DragHandlePluginProps, "pluginKey">,
  "element"
> & {
  className?: string;
  onNodeChange?: (data: {
    node: Node | null;
    editor: Editor;
    pos: number;
  }) => void;
  children: ReactNode;
};

export const DragHandle = (props: DragHandleProps) => {
  const {
    className = "drag-handle",
    children,
    editor,
    pluginKey = dragHandlePluginDefaultKey,
    onNodeChange,
    onElementDragStart,
    onElementDragEnd,
    computePositionConfig = defaultComputePositionConfig,
    nestedOptions,
  } = props;

  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const plugin = useRef<Plugin | null>(null);

  // Stable refs so the effect never needs to re-run due to callback identity changes
  const onNodeChangeRef = useRef(onNodeChange);
  const onElementDragStartRef = useRef(onElementDragStart);
  const onElementDragEndRef = useRef(onElementDragEnd);
  const computePositionConfigRef = useRef(computePositionConfig);

  // Keep refs current without triggering the effect
  useEffect(() => {
    onNodeChangeRef.current = onNodeChange;
  }, [onNodeChange]);
  useEffect(() => {
    onElementDragStartRef.current = onElementDragStart;
  }, [onElementDragStart]);
  useEffect(() => {
    onElementDragEndRef.current = onElementDragEnd;
  }, [onElementDragEnd]);
  useEffect(() => {
    computePositionConfigRef.current = computePositionConfig;
  }, [computePositionConfig]);

  useEffect(() => {
    if (!element || editor.isDestroyed) {
      return () => {
        plugin.current = null;
      };
    }

    console.log("drag handle effect");

    const initPlugin = DragHandlePlugin({
      editor,
      element,
      pluginKey,
      computePositionConfig: {
        ...defaultComputePositionConfig,
        ...computePositionConfigRef.current,
      },
      onElementDragStart: (e) => onElementDragStartRef.current?.(e),
      onElementDragEnd: (e) => onElementDragEndRef.current?.(e),
      onNodeChange: (data) => onNodeChangeRef.current?.(data),
      nestedOptions,
    });

    // We override it here so only the grip button is draggable.
    requestAnimationFrame(() => {
      element.draggable = false;
    });

    plugin.current = initPlugin.plugin;
    editor.registerPlugin(plugin.current);

    return () => {
      editor.unregisterPlugin(pluginKey);
      plugin.current = null;
      initPlugin.unbind();
    };
  }, [element, editor, pluginKey, nestedOptions]); // ← only truly stable deps

  return (
    <div
      className={className}
      style={{ visibility: "hidden", position: "absolute" }}
      data-dragging="false"
      ref={setElement}
    >
      {children}
    </div>
  );
};
