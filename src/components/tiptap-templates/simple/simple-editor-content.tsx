// simple-editor-content.tsx
"use client";

import React, { useState } from "react";
import { EditorContent, EditorContext } from "@tiptap/react";

import { BubbleMenu } from "src/components/tiptap-ui/bubble-menu/bubble-menu";
import { DragHandle } from "src/components/tiptap-ui/drag-handle/drag-handle";
import { ThreadSidebar } from "src/components/tiptap-ui/comments/components/thread-sidebar";
import { ImageBubble } from "src/components/tiptap-ui/image-bubble";
import { CoverHeader } from "src/components/tiptap-ui/cover";

import { TocSidebar } from "src/components/tiptap-node/toc-node/toc-sidebar";

import { FloatingMenu } from "@tiptap/react/menus";

import type { SimpleEditorContentProps } from "./types";
import { useCoverActions } from "./hooks/use-cover-actions";
import { useEditorLayout } from "./hooks/use-editor-layout";
import { useEditorSetup } from "./hooks/use-editor-setup";

import { FloatingActions } from "./floating-actions";

export type SaveState = "unsaved" | "saving" | "saved";

// ============================================================
// Component
// ============================================================

export function SimpleEditorContent({
  activePage,
  updateCoverAsync,
  sidebarWidth,
  collapsed,
  updatePageAsync,
  addCoverAsync,
  addPageAsync,
  pages,
}: SimpleEditorContentProps) {
  // const { save, saveState, isReady, isDirty, savingTimerRef, docCache } = useEditorSave({ activePage, updatePage });

  const { editor } = useEditorSetup({
    activePage,
    updatePageAsync,
    addPageAsync,
    pages,
  });

  const {
    open,
    setOpen,
    target,
    setTarget,
    onSelectAsync,
    onAddCoverAsync,
    floatingRef,
  } = useCoverActions({ activePage, updateCoverAsync, addCoverAsync });

  const { editorWrapperRef, editorLeft, paddingLeft, translateX } =
    useEditorLayout({ sidebarWidth, collapsed });

  const [hasThreads, setHasThreads] = useState(false);

  return (
    <EditorContext.Provider value={{ editor }}>
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
          activePage={activePage}
          updateCoverAsync={updateCoverAsync}
          paddingLeft={paddingLeft}
          translateX={translateX}
          hasThreads={hasThreads}
        />
        <div
          ref={editorWrapperRef}
          style={
            {
              paddingLeft: paddingLeft,
              "--x": `${translateX}px`,
            } as React.CSSProperties
          } // Todo: Make 250 constant (e.g: const PaddingLeft = 250)
        >
          <EditorContent
            // ref={editorWrapperRef}
            editor={editor}
            role="presentation"
            data-size={activePage.settings.width}
            data-text={activePage.settings.text}
            data-locked={activePage.settings.locked}
            className={`simple-editor-content ${hasThreads ? "has-threads" : ""}`}
          />
        </div>
        <ThreadSidebar
          pageId={activePage.id}
          editor={editor}
          setHasThreads={setHasThreads}
        />

        <FloatingMenu
          editor={editor}
          shouldShow={() => !!editor?.isActive("title")}
          options={{
            placement: "top",
            //offset: 8,
            //  updateDelay: 0,
            onShow() {
              floatingRef.current?.classList.remove("floating-hide");
              floatingRef.current?.classList.add("floating-show");
            },
            onHide: () => {
              floatingRef.current?.classList.remove("floating-show");
              floatingRef.current?.classList.add("floating-hide");
            },
          }}
        >
          <div ref={floatingRef}>
            <FloatingActions
              hasIcon={!!activePage.cover.iconName}
              hasCover={!!activePage.cover.coverImage}
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
      </section>

      <TocSidebar topOffset={80} maxShowCount={20} />
      <DragHandle editor={editor} />
      <BubbleMenu editor={editor} />
      <ImageBubble editor={editor} />
    </EditorContext.Provider>
  );
}
