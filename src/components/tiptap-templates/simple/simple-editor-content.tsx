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
import { useActivePageState } from "./context/active-page-context";
import {
  useEditorLayoutActions,
  useEditorLayoutState,
  useEditorLayoutTransient,
} from "./context/editor-layout-context";
import { useRecordPropertyPanel } from "./hooks/use-record-property-panel";
import { useEditorSync } from "./context/editor-sync-context";
import { EditorBodySkeleton } from "./components/skeletons";
import { usePageComment } from "./hooks/use-page-comment";
import { DiscussionPane } from "src/components/tiptap-ui/discussion-pane";
import { CommentThreadPopover } from "src/components/tiptap-ui/comments/components/comment-thread-popover";
import { BlockCommentHandle } from "src/components/tiptap-ui/block-comment-handle";
import { useLayoutMode } from "./hooks/use-layout-mode";
import { calculatePaddingLeft, calculateSidebarWidth } from "src/lib/utils";

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
    prev.current = props;
  });
}

const EditorContentMemo = React.memo(function EditorContentMemo({
  hasThreads,
}: {
  hasThreads: boolean;
}) {
  const { editor } = useCurrentEditor();
  const { activePage } = useActivePageState();
  const { collapsed } = useEditorLayoutState();
  const { isSyncing } = useEditorSync();

  useRecordPropertyPanel(editor, activePage ?? null);
  usePageComment(editor, activePage ?? null);

  if (isSyncing || !editor) {
    return (
      <EditorBodySkeleton
        content={activePage?.content}
        size={activePage?.settings.width}
        text={activePage?.settings.text}
        collapsed={collapsed}
        hasThreads={hasThreads}
      />
    );
  }

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
  const { editorWrapperRef, translateX, onDiscussionOpenChanged } =
    useEditorLayoutActions();
  const { collapsed, discussionOpen, commentDisplayMode } =
    useEditorLayoutState();
  const { expandedWidth } = useEditorLayoutTransient();
  const { isMobile, mode } = useLayoutMode();
  const sidebarWidth = calculateSidebarWidth(mode, collapsed, expandedWidth);
  const paddingLeft = calculatePaddingLeft(collapsed);

  const { activePage, activePageId } = useActivePageState();

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

  const { editor } = useCurrentEditor();

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
      <section className="simple-editor-center">
        <div>
          <CoverHeader
            collapsed={collapsed}
            sidebarWidth={isMobile ? 0 : sidebarWidth}
            paddingLeft={isMobile ? 0 : paddingLeft}
            translateX={translateX}
            hasThreads={hasThreads}
            marginLeft={isMobile ? 0 : sidebarWidth / 2}
          />
        </div>
        <div
          ref={editorWrapperRef}
          style={
            {
              width: isMobile ? "100%" : `calc(100vw)`,
              // Drive block indentation via vars — the wrapper no longer
              // shifts as a whole (so the database can stay full-width).
              "--block-margin-left": isMobile
                ? "0px"
                : activePage?.settings.width === "medium"
                  ? "280px"
                  : `${sidebarWidth / 2}px`,
              "--block-padding-left": isMobile ? "0px" : `${paddingLeft}px`,
              "--sidebar-width": `${sidebarWidth}px`,
              "--x": `${translateX}px`,
            } as React.CSSProperties
          }
        >
          <EditorContentMemo hasThreads={hasThreads} />
        </div>
        {editor && (
          <FloatingMenuMemo
            open={open}
            setOpen={setOpen}
            target={target}
            setTarget={setTarget}
            onSelectAsync={onSelectAsync}
            onAddCoverAsync={onAddCoverAsync}
            floatingRef={floatingRef}
          />
        )}
      </section>

      <div className="right-gutter-container">
        {commentDisplayMode === "popover" && !discussionOpen ? (
          <CommentThreadPopover key="comment-thread-popover" editor={editor} />
        ) : discussionOpen ? (
          <div className="right-gutter" style={{ minWidth: 320 }}>
            <DiscussionPane
              key="discussion-pane"
              editor={editor}
              pageId={activePageId}
              onClose={() => onDiscussionOpenChanged(false)}
            />
          </div>
        ) : (
          <div className="right-gutter" style={{ minWidth: 0 }}>
            <ThreadSidebarMemo
              key="thread-sidebar"
              setHasThreads={setHasThreads}
            />
          </div>
        )}
      </div>
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
      {editor && <DragHandle editor={editor} />}

      {editor && <BlockCommentHandle editor={editor} />}

      {editor && <BubbleMenu editor={editor} />}

      {editor && <ImageBubble editor={editor} />}
    </>
  );
}
