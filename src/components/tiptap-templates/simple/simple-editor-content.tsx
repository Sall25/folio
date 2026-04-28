// simple-editor-content.tsx
"use client";

import React, { useState } from "react";
import { EditorContent, useCurrentEditor } from "@tiptap/react";

import { BubbleMenu } from "src/components/tiptap-ui/bubble-menu/bubble-menu";
import { DragHandle } from "src/components/tiptap-ui/drag-handle/drag-handle";
import { ThreadSidebar } from "src/components/tiptap-ui/comments/components/thread-sidebar";
import { ImageBubble } from "src/components/tiptap-ui/image-bubble";
import { CoverHeader } from "src/components/tiptap-ui/cover";
import { TocSidebar } from "src/components/tiptap-node/toc-node/toc-sidebar";
import { FloatingMenu } from "@tiptap/react/menus";

import { useCoverActions } from "./hooks/use-cover-actions";
import { useEditorLayout } from "./hooks/use-editor-layout";
import { FloatingActions } from "./floating-actions";
import type { Target } from "src/components/tiptap-ui/cover/types";
// ============================================================
// Memoized leaves
// ============================================================

const EditorContentMemo = React.memo(function EditorContentMemo({
  hasThreads,
}: {
  hasThreads: boolean;
}) {
  const { editor } = useCurrentEditor();
  return (
    <EditorContent
      editor={editor}
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
  editorLeft,
  open,
  setOpen,
  target,
  setTarget,
  onSelectAsync,
  onAddCoverAsync,
  floatingRef,
}: {
  editorLeft: number;
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
          editorLeft={editorLeft}
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

const StableShell = React.memo(function StableShell({
  sidebarWidth,
  collapsed,
}: {
  sidebarWidth: number;
  collapsed: boolean;
}) {
  const { editorWrapperRef, editorLeft, paddingLeft, translateX } =
    useEditorLayout({ sidebarWidth, collapsed });

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

  return (
    <section
      className="simple-editor-center"
      style={{
        width: `calc(100vw - ${sidebarWidth}px)`,
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
      <ThreadSidebarMemo setHasThreads={setHasThreads} />
      <FloatingMenuMemo
        editorLeft={editorLeft}
        open={open}
        setOpen={setOpen}
        target={target}
        setTarget={setTarget}
        onSelectAsync={onSelectAsync}
        onAddCoverAsync={onAddCoverAsync}
        floatingRef={floatingRef}
      />
    </section>
  );
});

// ============================================================
// Root component
// ============================================================

export function SimpleEditorContent({
  sidebarWidth,
  collapsed,
}: {
  sidebarWidth: number;
  collapsed: boolean;
}) {
  const { editor } = useCurrentEditor();

  return (
    <>
      <StableShell sidebarWidth={sidebarWidth} collapsed={collapsed} />
      <TocSidebar topOffset={80} maxShowCount={20} />
      <DragHandle editor={editor} />
      <BubbleMenu editor={editor} />
      <ImageBubble editor={editor} />
    </>
  );
}
