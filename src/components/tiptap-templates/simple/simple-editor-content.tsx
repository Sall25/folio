// simple-editor-content.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useCurrentEditor } from "@tiptap/react";

import { BubbleMenu } from "src/components/tiptap-ui/bubble-menu/bubble-menu";
import { DragHandle } from "src/components/tiptap-ui/drag-handle/drag-handle";
import { ThreadSidebar } from "src/components/tiptap-ui/comments/components/thread-sidebar";
import { ImageBubble } from "src/components/tiptap-ui/image-bubble";
import { CoverHeader } from "src/components/tiptap-ui/cover";
import { FloatingMenu } from "@tiptap/react/menus";

import { useCoverActions } from "./hooks/use-cover-actions";
import { FloatingActions } from "./floating-actions";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { useActivePage } from "./context/active-page-context";
import { useEditorLayout } from "./context/editor-layout-context";
import { useRecordPropertyPanel } from "./hooks/use-record-property-panel";

// ============================================================
// Memoized leaves
// ============================================================

function useWhyDidYouRender(name: string, props: Record<string, unknown>) {
  const prev = useRef(props);
  useEffect(() => {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    Object.keys(props).forEach((key) => {
      if (prev.current[key] !== props[key]) {
        changes[key] = { from: prev.current[key], to: props[key] };
      }
    });
    if (Object.keys(changes).length) {
      console.log(`[${name}] re-render caused by:`, changes);
    }
    prev.current = props;
  });
}

const EditorContentMemo = React.memo(function EditorContentMemo({
  hasThreads,
}: {
  hasThreads: boolean;
}) {
  const { editor } = useCurrentEditor();
  const { activePage } = useActivePage();
  const { collapsed } = useEditorLayout();

  useRecordPropertyPanel(editor, activePage ?? null);

  return (
    <EditorContent
      editor={editor}
      data-size={activePage?.settings.width}
      data-text={activePage?.settings.text}
      data-locked={activePage?.settings.locked}
      data-collapsed={collapsed ? "true" : "false"}
      role="presentation"
      className={`simple-editor-content ${hasThreads ? "has-threads" : ""}`}
    />
  );
});

const ThreadSidebarMemo = React.memo(function ThreadSidebarMemo({
  setHasThreads,
}: {
  setHasThreads: (v: boolean) => void;
}) {
  const { editor } = useCurrentEditor();

  return <ThreadSidebar editor={editor} setHasThreads={setHasThreads} />;
});

const FloatingMenuMemo = React.memo(function FloatingMenuMemo({
  open,
  setOpen,
  target,
  setTarget,
  onSelectAsync,
  onAddCoverAsync,
  floatingRef,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  target: Target;
  setTarget: (v: Target) => void;
  onSelectAsync: (value: string) => Promise<void>;
  onAddCoverAsync: () => Promise<void>;
  floatingRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { editor } = useCurrentEditor();
  return (
    <FloatingMenu
      editor={editor}
      shouldShow={() => !!editor?.isActive("title")}
      options={{
        placement: "top",
        onShow() {
          floatingRef.current?.classList.remove("floating-hide");
          floatingRef.current?.classList.add("floating-show");
        },
        onHide() {
          floatingRef.current?.classList.remove("floating-show");
          floatingRef.current?.classList.add("floating-hide");
        },
      }}
    >
      <div ref={floatingRef}>
        <FloatingActions
          open={open}
          onOpenChange={setOpen}
          target={target}
          onTargetChange={setTarget}
          onSelect={onSelectAsync}
          onAddCoverAsync={onAddCoverAsync}
        />
      </div>
    </FloatingMenu>
  );
});

// ============================================================
// Stable shell — never re-renders from editor transactions
// ============================================================

const StableShell = React.memo(function StableShell() {
  const { editorWrapperRef, paddingLeft, translateX, sidebarWidth, collapsed } =
    useEditorLayout();

  const {
    open,
    setOpen,
    target,
    setTarget,
    onSelectAsync,
    onAddCoverAsync,
    floatingRef,
  } = useCoverActions();

  const [hasThreads, setHasThreads] = useState(false);

  useWhyDidYouRender("stableShell", {
    hasThreads,
    editorWrapperRef,
    paddingLeft,
    translateX,
    open,
    setOpen,
    target,
    setTarget,
    onSelectAsync,
    onAddCoverAsync,
    floatingRef,
  });

  return (
    <>
      <section
        className="simple-editor-center"
        style={{
          width: `calc(100vw)`,
          marginLeft: sidebarWidth,
          transition: "margin-left 0.2s ease, width 0.2s ease",
        }}
      >
        <CoverHeader
          collapsed={collapsed}
          sidebarWidth={sidebarWidth}
          paddingLeft={paddingLeft}
          translateX={translateX}
          hasThreads={hasThreads}
        />
        <div
          ref={editorWrapperRef}
          style={
            {
              paddingLeft,
              "--x": `${translateX}px`,
            } as React.CSSProperties
          }
        >
          <EditorContentMemo hasThreads={hasThreads} />
        </div>
        <FloatingMenuMemo
          open={open}
          setOpen={setOpen}
          target={target}
          setTarget={setTarget}
          onSelectAsync={onSelectAsync}
          onAddCoverAsync={onAddCoverAsync}
          floatingRef={floatingRef}
        />
      </section>
      <ThreadSidebarMemo setHasThreads={setHasThreads} />
    </>
  );
});

// ============================================================
// Root component
// ============================================================

export function SimpleEditorContent() {
  const { editor } = useCurrentEditor();

  return (
    <>
      <StableShell />
      <DragHandle editor={editor} />
      <BubbleMenu editor={editor} />
      <ImageBubble editor={editor} />
    </>
  );
}
