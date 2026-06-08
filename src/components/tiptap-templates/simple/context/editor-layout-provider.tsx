import { useCallback, type ReactNode } from "react";
import {
  EditorLayoutContext,
  PADDING_LEFT,
  TRANSLATE_X,
} from "./editor-layout-context";
import { useEffect, useRef, useState } from "react";

interface EditorLayoutProviderProps {
  children: ReactNode;
}

const SIDEBAR_WIDTH = 270;
const SIDEBAR_COLLAPSED_WIDTH = 52;

export function EditorLayoutProvider({ children }: EditorLayoutProviderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [editorLeft, setEditorLeft] = useState(0);
  const paddingLeft = collapsed
    ? 100 //PADDING_LEFT - Math.round(sidebarWidth / 6)
    : PADDING_LEFT;

  const onCollapsedChange = useCallback((v: boolean) => setCollapsed(v), []);
  const onVersionHistoryOpenChanged = useCallback(
    (v: boolean) => setVersionHistoryOpen(v),
    [],
  );

  useEffect(() => {
    if (!editorWrapperRef.current) return;

    const raf = requestAnimationFrame(() => {
      queueMicrotask(() => {
        const { left } = editorWrapperRef.current!.getBoundingClientRect();
        setEditorLeft(left);
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [sidebarWidth, collapsed]);

  return (
    <EditorLayoutContext.Provider
      value={{
        sidebarWidth,
        collapsed,
        editorWrapperRef,
        editorLeft,
        paddingLeft,
        translateX: TRANSLATE_X,
        onCollapsedChange,
        versionHistoryOpen,
        onVersionHistoryOpenChanged,
      }}
    >
      {children}
    </EditorLayoutContext.Provider>
  );
}
