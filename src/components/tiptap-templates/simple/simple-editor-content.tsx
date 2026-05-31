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
import { useActivePage } from "./use-active-page";
import { useEditorLayout } from "./context/editor-layout-context";
import { useRecordPropertyPanel } from "./hooks/use-record-property-panel";

function usePageSwitching() {
  const { activePageId } = useActivePage();
  const [switching, setSwitching] = useState(false);
  const prevPageId = useRef(activePageId);

  useEffect(() => {
    if (prevPageId.current === activePageId) return;
    prevPageId.current = activePageId;

    const show = setTimeout(() => setSwitching(true), 0);
    const hide = setTimeout(() => setSwitching(false), 300);

    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [activePageId]);

  return switching;
}

function PageSwitchIndicator({ switching }: { switching: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        width: 300,

        background: "var(--tt-brand-color-400)",
        transformOrigin: "left",
        transform: switching ? "scaleX(0.7)" : "scaleX(1)",
        opacity: switching ? 1 : 0,
        transition: switching
          ? "transform 0.3s ease"
          : "opacity 0.2s ease 0.1s, transform 0.1s ease",
      }}
    />
  );
}

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
  const { activePage, pages } = useActivePage();

  useRecordPropertyPanel(editor, pages, activePage?.id ?? null);

  return (
    <EditorContent
      editor={editor}
      data-size={activePage?.settings.width}
      data-text={activePage?.settings.text}
      data-locked={activePage?.settings.locked}
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
  const switching = usePageSwitching();

  return (
    <>
      <PageSwitchIndicator switching={switching} />
      <StableShell />
      <DragHandle editor={editor} />
      <BubbleMenu editor={editor} />
      <ImageBubble editor={editor} />
    </>
  );
}
