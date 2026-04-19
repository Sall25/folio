// simple-editor-content.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";

import { BubbleMenu } from "src/components/tiptap-ui/bubble-menu/bubble-menu";
import { DragHandle } from "src/components/tiptap-ui/drag-handle/drag-handle";
import { ThreadSidebar } from "src/components/tiptap-ui/comments/components/thread-sidebar";
import { useScrollToAnchor } from "src/components/tiptap-ui/copy-anchor-link-button";
import { ImageBubble } from "src/components/tiptap-ui/image-bubble";
import { CoverHeader } from "src/components/tiptap-ui/cover";

import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import { TocSidebar } from "src/components/tiptap-node/toc-node/toc-sidebar";

import { buildExtensions } from "./simple-editor-extensions";
import type { Page } from "./types";
import { Node } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { FloatingMenu } from "@tiptap/react/menus";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import {
  Image,
  MessageSquare,
  MessageSquareText,
  Pencil,
  Smile,
} from "lucide-react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { IconPickerCard } from "src/components/tiptap-ui/cover/icon-picker-card";
import { Button } from "src/components/tiptap-ui-primitive/button";

import "./floating-actions.scss";

// ============================================================
// FloatingActions
// ============================================================
function FloatingActions({
  hasIcon,
  hasCover,
  editorLeft,
  open,
  onOpenChange,
  target,
  onTargetChange,
  onSelect,
  onAddCover,
}: {
  hasIcon: boolean;
  hasCover: boolean;
  editorLeft: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  onTargetChange: (t: Target) => void;
  onSelect: (name: string, color?: string) => void;
  onAddCover: () => void;
}) {
  return (
    <div
      // style={{
      //   paddingTop: hasIcon ? 8 : hasCover ? 8 : 48,
      //   display: "flex",
      //   gap: 6,
      // }}
      className="floating-actions"
      style={{ paddingTop: hasIcon ? 8 : hasCover ? 8 : 48 }}
    >
      {!hasIcon && (
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="ghost">
              <Smile className="tiptap-button-icon" />
              <span>Add icon</span>
            </Button>
          </PopoverTrigger>
          <PopoverPortal container={document.getElementById("modal-root")}>
            <PopoverContent
              style={{ position: "fixed", zIndex: 9999 }}
              side="bottom"
              align="start"
            >
              <IconPickerCard
                target={target}
                onTargetChange={onTargetChange}
                onSelect={onSelect}
              />
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      )}

      {!hasCover && (
        <Button variant="ghost" onClick={onAddCover}>
          <Image className="tiptap-button-icon" />
          <span>Add cover</span>
        </Button>
      )}

      <Button variant="ghost">
        <MessageSquareText className="tiptap-button-icon" />
        <span>Comment</span>
      </Button>
    </div>
  );
}

export type SaveState = "unsaved" | "saving" | "saved";

type SimpleEditorContentProps = {
  activePage: Page;
  updateCover: (cover: Page["cover"]) => void;
  sidebarWidth: number;
  collapsed: boolean;
  updatePage: (page: Page) => void;
  addCover: (id: string) => void;
};

// ============================================================
// Component
// ============================================================

export function SimpleEditorContent({
  activePage,
  updateCover,
  sidebarWidth,
  collapsed,
  updatePage,
  addCover,
}: SimpleEditorContentProps) {
  const { setTocContent } = useToc();

  const isReady = useRef(false);
  const isDirty = useRef(false);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docCache = useRef<Map<string, Node>>(new Map());
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("Emoji");
  const [hasThreads, setHasThreads] = useState(false);
  const floatingRef = useRef<HTMLDivElement>(null);
  const activePageRef = useRef(activePage);
  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  const onSelect = useCallback(
    (name: string, color?: string) => {
      setOpen(false);
      updateCover({
        ...activePageRef.current.cover,
        iconName: name,
        target,
        color,
      });
    },
    [updateCover, target],
  );

  const save = useCallback(
    (editor: ReturnType<typeof useEditor>) => {
      if (
        !editor ||
        !isReady.current ||
        !isDirty.current ||
        !activePageRef.current.id
      )
        return;

      setSaveState("saving");
      docCache.current.delete(activePageRef.current.id);

      updatePage({
        ...activePageRef.current,
        content: editor.getJSON(),
      });

      isDirty.current = false;

      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
      savingTimerRef.current = setTimeout(() => {
        setSaveState("saved");
      }, 600);
    },
    [updatePage],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: buildExtensions(setTocContent),
    onUpdate() {
      if (!isReady.current) return;
      isDirty.current = true;
      setSaveState("unsaved");

      // Only care about title changes
      const selection = editor?.state.selection;
      if (!selection) return;
      const { $from } = selection;
      const isInTitle =
        $from.node().type.name === "title" ||
        $from.node(1)?.type.name === "title";
      if (!isInTitle) return;

      const titleNode = editor?.state.doc.firstChild;
      const newTitle = titleNode?.textContent;
      if (newTitle !== activePageRef.current.title) {
        activePageRef.current = {
          ...activePageRef.current,
          title: newTitle ?? "New Page",
        };
        updatePage({
          ...activePageRef.current,
          title: newTitle ?? "New Page",
        });

        // Debounce save to persist full content including new title
        if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
        savingTimerRef.current = setTimeout(() => {
          save(editor!);
        }, 1000);
      }
    },
    // onUpdate() {
    //   if (!isReady.current) return;
    //   isDirty.current = true;
    //   setSaveState("unsaved");

    //   // ← read title directly from editor on every update
    //   const selection = editor?.state.selection;
    //   if (!selection) return;
    //   const { $from } = selection;
    //   const node = $from.node();
    //   if (node.type.name === "title") {
    //     updatePage({
    //       ...activePageRef.current,
    //       title: node.textContent,
    //     });
    //   }
    // },
    content: activePage.content,
  });

  useEffect(() => {
    isReady.current = true;
    return () => {
      isReady.current = false;
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    isReady.current = false;
    isDirty.current = false;
    if (!activePage?.id) return;

    const raf = requestAnimationFrame(() => {
      let doc = docCache.current.get(activePage.id);

      if (!doc) {
        doc = Node.fromJSON(editor.schema, activePage.content);
        docCache.current.set(activePage.id, doc);
      }

      // Save current selection before wiping state
      const { from, to } = editor.state.selection;

      const state = EditorState.create({
        doc,
        schema: editor.schema,
        plugins: editor.state.plugins,
      });

      editor.view.updateState(state);

      // Restore selection after state update
      try {
        const restoredSelection = TextSelection.create(state.doc, from, to);
        editor.view.dispatch(editor.state.tr.setSelection(restoredSelection));
      } catch {
        // If position is out of bounds (e.g. doc shrunk), do nothing
      }

      isReady.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [activePage.id, editor, activePage.content]);

  // Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save(editor!);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, save]);

  useEffect(() => {
    return () => {
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    };
  }, []);

  useScrollToAnchor({ editor });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!activePage.settings.locked, false);
  }, [activePage.settings.locked, editor]);

  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [editorLeft, setEditorLeft] = useState(0);
  const paddingLeft = 250;
  const translateX = -80;

  useEffect(() => {
    if (!editorWrapperRef.current) return;

    const raf = requestAnimationFrame(() => {
      const { left } = editorWrapperRef.current!.getBoundingClientRect();
      setEditorLeft(left);
      console.log("left ", left);
    });

    return () => cancelAnimationFrame(raf);
  }, [sidebarWidth, collapsed]);

  const onAddCover = useCallback(
    () => addCover(activePageRef.current.id),
    [addCover],
  );

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
          updateCover={updateCover}
          saveState={saveState}
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
        <ThreadSidebar editor={editor} setHasThreads={setHasThreads} />

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
              onSelect={onSelect}
              onAddCover={onAddCover}
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
