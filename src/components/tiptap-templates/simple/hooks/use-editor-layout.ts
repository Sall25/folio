// use-editor-layout.ts
import { useEffect, useRef, useState } from "react";

export const PADDING_LEFT = 250;
export const TRANSLATE_X = -80;

type UseEditorLayoutProps = {
  sidebarWidth: number;
  collapsed: boolean;
};

export function useEditorLayout({
  sidebarWidth,
  collapsed,
}: UseEditorLayoutProps) {
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [editorLeft, setEditorLeft] = useState(0);

  useEffect(() => {
    if (!editorWrapperRef.current) return;

    const raf = requestAnimationFrame(() => {
      const { left } = editorWrapperRef.current!.getBoundingClientRect();
      setEditorLeft(left);
    });

    return () => cancelAnimationFrame(raf);
  }, [sidebarWidth, collapsed]);

  return {
    editorWrapperRef,
    editorLeft,
    paddingLeft: PADDING_LEFT,
    translateX: TRANSLATE_X,
  };
}
