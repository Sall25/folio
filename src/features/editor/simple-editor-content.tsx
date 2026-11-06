// simple-editor-content.tsx
"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EditorContent, useCurrentEditor } from "@tiptap/react";

import { BubbleMenu } from "src/components/tiptap-ui/bubble-menu/bubble-menu";
import { DragHandle } from "src/components/tiptap-ui/drag-handle/drag-handle";
import { BlockMarquee } from "src/components/tiptap-ui/block-marquee";
import { ImageBubble } from "src/components/tiptap-ui/image-bubble";
import { CoverHeader } from "src/features/pages/cover";
import { FloatingMenu } from "@tiptap/react/menus";

import { useCoverActions } from "../pages/cover/use-cover-actions";
import { FloatingActions } from "../shell/floating-actions";
import type { Target } from "src/features/pages/cover/types";
import { useActivePageState } from "../pages/context/active-page-context";
import {
  useEditorLayoutActions,
  useEditorLayoutState,
  useEditorLayoutTransient,
} from "../shell/context/editor-layout-context";
import { useRecordPropertyPanel } from "../database/record-property-panel/use-record-property-panel";
import { useEditorSync } from "./context/editor-sync-context";
import { EditorBodySkeleton } from "../shell/skeletons";
import { usePageComment } from "../comments/page-comment-node/use-page-comment";
import { DiscussionPane } from "src/features/comments/discussion-pane";
import { CommentThreadPopover } from "src/features/comments/components/comment-thread-popover";
import { useSyncThreadsToEditor } from "src/features/comments/hooks/use-sync-threads-to-editor";
import { BlockCommentHandle } from "src/features/comments/block-comment-handle";
import { useLayoutMode } from "../shell/hooks/use-layout-mode";
import { calculatePaddingLeft, calculateSidebarWidth } from "src/lib/utils";
import { UnavailableOffline } from "./unavailable-offline";
import { NewPageStarter } from "./new-page-starter";

// The least space kept on each side of the page's column (the left one holds
// the block handles).
const COLUMN_EDGE = 64;

/**
 * Where the page's column goes: its offset from the editor wrapper's left
 * edge (what blocks are shifted by) and the most width it may take.
 *
 * The usual offset (`preferred`, the page's own spacing from the sidebar)
 * is kept whenever the column fits on screen with it. On a narrower screen
 * the column moves left just enough to fit, keeping COLUMN_EDGE from the
 * sidebar and from the right edge; narrower still, it gets narrower.
 *
 * The visible area is .simple-editor-main; the wrapper runs wider than it,
 * so both are measured, again whenever either changes size.
 */
function useColumnPlacement(
  wrapperRef: React.RefObject<HTMLDivElement | null>,
  columnWidth: number,
  preferred: number,
  enabled: boolean,
): { offset: number; room: number } | null {
  const [placement, setPlacement] = useState<{
    offset: number;
    room: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;
    const wrapper = wrapperRef.current;
    const main = wrapper?.closest<HTMLElement>(".simple-editor-main");
    if (!wrapper || !main) return;

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // The visible area, in the wrapper's coordinates.
        const left =
          main.getBoundingClientRect().left -
          wrapper.getBoundingClientRect().left;
        const width = main.clientWidth; // without its scrollbar
        const room = Math.max(0, Math.round(width - COLUMN_EDGE * 2));
        const column = Math.min(columnWidth, room);
        const minOffset = left + COLUMN_EDGE;
        const maxOffset = left + width - COLUMN_EDGE - column;
        const offset = Math.round(
          Math.max(minOffset, Math.min(preferred, maxOffset)),
        );
        setPlacement((prev) =>
          prev && prev.offset === offset && prev.room === room
            ? prev
            : { offset, room },
        );
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    observer.observe(wrapper);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [wrapperRef, columnWidth, preferred, enabled]);

  return placement;
}

// ============================================================
// Memoized leaves
// ============================================================

function useWhyDidYouRender(_: string, props: Record<string, unknown>) {
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
  const { isSyncing, unavailableOffline, stalled, retry } = useEditorSync();

  useRecordPropertyPanel(editor, activePage ?? null);
  usePageComment(editor, activePage ?? null);

  if (unavailableOffline && !editor) return <UnavailableOffline />;
  if (stalled && !editor) return <UnavailableOffline stalled onRetry={retry} />;

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
  const { collapsed, discussionOpen } = useEditorLayoutState();
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

  // Inline comments open in a popover now — nothing reserves a right gutter.
  const hasThreads = false;

  // The page's column: the usual spacing from the sidebar (as before) when
  // it fits on screen, moved left just enough when it doesn't (narrower
  // laptops pushed it past the right edge).
  const columnWidth =
    activePage?.settings.width === "full" ? (collapsed ? 1320 : 1080) : 800;
  const preferredOffset =
    activePage?.settings.width === "medium"
      ? 280 + paddingLeft
      : sidebarWidth / 2 + paddingLeft;
  const placement = useColumnPlacement(
    editorWrapperRef,
    columnWidth,
    preferredOffset,
    !isMobile,
  );
  const contentOffset = `${placement?.offset ?? preferredOffset}px`;
  const editorRoom = placement ? `${placement.room}px` : `${columnWidth}px`;

  const { editor } = useCurrentEditor();

  // Highlights for the page's open inline comments (+ the local draft).
  useSyncThreadsToEditor(editor, activePageId);

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
            contentOffset={isMobile ? undefined : contentOffset}
          />
        </div>
        <div
          ref={editorWrapperRef}
          style={
            {
              width: isMobile ? "100%" : `calc(100vw)`,
              // Drive block indentation via vars — the wrapper no longer
              // shifts as a whole (so the database can stay full-width).
              "--block-margin-left": isMobile ? "0px" : contentOffset,
              "--block-padding-left": "0px",
              // How wide the column may get here (simple-editor.scss caps
              // the page width with it).
              "--editor-room": isMobile ? "100%" : editorRoom,
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
        {discussionOpen && (
          <div className="right-gutter" style={{ minWidth: 320 }}>
            <DiscussionPane
              key="discussion-pane"
              editor={editor}
              pageId={activePageId}
              onClose={() => onDiscussionOpenChanged(false)}
            />
          </div>
        )}
      </div>

      <CommentThreadPopover editor={editor} />
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

      {editor && <BlockMarquee editor={editor} />}

      {editor && <BlockCommentHandle editor={editor} />}

      {editor && <BubbleMenu editor={editor} />}

      {editor && <ImageBubble editor={editor} />}

      {editor && <NewPageStarter editor={editor} />}
    </>
  );
}
