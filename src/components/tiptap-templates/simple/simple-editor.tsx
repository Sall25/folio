"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { TableOfContents } from "@tiptap/extension-table-of-contents";

// --- Custom Extensions ---
import { SlashCommand } from "src/components/tiptap-ui/slash-menu";
import { MentionExtension } from "src/components/tiptap-ui/mention-menu";
import { EmojiExtension } from "src/components/tiptap-ui/emoji-menu";
// import { CommentExtension } from 'src/components/tiptap-ui/comments'

// --- UI Primitives ---
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "src/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "src/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import {
  NodeBackground,
  NodeAlignment,
  NodeClearContents,
  NodeColor,
  NodeFit,
} from "src/components/tiptap-extension";
import "src/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "src/components/tiptap-node/code-block-node/code-block-node.scss";
import "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "src/components/tiptap-node/list-node/list-node.scss";
import "src/components/tiptap-node/image-node/image-node.scss";
import "src/components/tiptap-node/heading-node/heading-node.scss";
import "src/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { UndoRedoButton } from "src/components/tiptap-ui/undo-redo-button";
import { BubbleMenu } from "src/components/tiptap-ui/bubble-menu/bubble-menu";

// --- Icons ---
import { ArrowLeftIcon } from "src/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "src/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "src/components/tiptap-icons/link-icon";

// --- Hooks ---
import { useIsBreakpoint } from "src/hooks/use-is-breakpoint";
import { useWindowSize } from "src/hooks/use-window-size";
import { useCursorVisibility } from "src/hooks/use-cursor-visibility";

// --- Components ---
import { ThemeToggle } from "src/components/tiptap-templates/simple/theme-toggle";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "src/lib/tiptap-utils";

// --- Styles ---
import "src/components/tiptap-templates/simple/simple-editor.scss";
import "src/components/tiptap-templates/simple/toc.scss";

import content from "src/components/tiptap-templates/simple/data/content.json";

import DragHandleExtension from "src/components/tiptap-ui/drag-handle/drag-handle-extension";
import { DragHandle } from "src/components/tiptap-ui/drag-handle/drag-handle";
// import { CommentSidebar } from "src/components/tiptap-ui/comments/comment-sidebar/comment-sidebar"
import { CommentThreadExtension } from "src/components/tiptap-ui/comments/extensions/comment-thread-extension";
import { ThreadSidebar } from "src/components/tiptap-ui/comments/components/thread-sidebar";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { AvatarDemo } from "src/components/tiptap-ui-primitive/avatar";
import UniqueID from "@tiptap/extension-unique-id";
import { useScrollToAnchor } from "src/components/tiptap-ui/copy-anchor-link-button";
import { ImageBubble } from "src/components/tiptap-ui/image-bubble";
import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import { TocNode } from "src/components/tiptap-node/toc-node/toc-node-extension";
import { TocProvider } from "src/components/tiptap-node/toc-node/toc-provider";
import { TocSidebar } from "src/components/tiptap-node/toc-node/toc-sidebar";
import { Figure, FigureCaption } from "src/components/tiptap-node/figure-node";
import { TableKit } from "@tiptap/extension-table";
import { TableContextExtension } from "src/components/tiptap-node/table-node";
import { TableWrapperNode } from "src/components/tiptap-node/table-node/extensions/table-context";
import { ToastProvider } from "src/components/tiptap-ui/copy-toast";
import { Column, ColumnBlock } from "src/components/tiptap-node/column-node";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { ColumnDragHandle } from "src/components/tiptap-ui/drag-handle/column-drag-handle";

const MainToolbarContent = ({ isMobile }: { isMobile: boolean }) => {
  const { editor } = useTiptapEditor();
  return (
    <>
      <ToolbarGroup>
        <Button onClick={() => editor?.commands.insertColumns(3)}>
          Column
        </Button>
      </ToolbarGroup>
      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
        <Separator orientation="vertical" />
        <ThemeToggle />
        <Separator orientation="vertical" />
        <AvatarDemo />
      </ToolbarGroup>
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />
  </>
);

function SimpleEditorInner() {
  const { setTocContent } = useToc();
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main",
  );
  const toolbarRef = useRef<HTMLDivElement>(null);

  // store toolbar height in state so we never read ref during render
  const [overlayHeight, setOverlayHeight] = useState(0);

  useEffect(() => {
    const update = () => {
      const h = toolbarRef.current?.getBoundingClientRect().height;
      if (h != null) setOverlayHeight(h);
    };
    update();

    let observer: ResizeObserver | null = null;
    if (toolbarRef.current) {
      observer = new ResizeObserver(update);
      observer.observe(toolbarRef.current);
    }
    return () => observer?.disconnect();
  }, []);

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
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      TableOfContents.configure({
        onUpdate(content) {
          setTocContent(content);
        },
      }),
      TocNode.configure({ topOffset: 80, maxShowCount: 20, showTitle: true }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TextStyle,
      Color,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      FigureCaption,
      Figure.configure({
        directions: ["left", "right"],
        preserveAspectRatio: true,
        min: { width: 10, height: 10 },
        max: { width: 2000, height: 2000 },
      }),
      Image.configure({
        resize: {
          enabled: true,
          directions: ["left", "right"],
          alwaysPreserveAspectRatio: true,
        },
      }),
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      Placeholder.configure({
        placeholder: ({ editor }) => {
          const meta = editor.state.tr.getMeta("/Filter");
          if (meta) {
            return "/Filter";
          }
          return "Write, type '/' from commands...";
        },
      }),
      SlashCommand,
      MentionExtension,
      EmojiExtension,
      CommentThreadExtension,
      UniqueID.configure({
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "figure",
          "codeBlock",
          "table",
        ],
        attributeName: "id",
      }),
      DragHandleExtension,
      NodeBackground.configure({
        useStyle: false,
      }),
      NodeAlignment.configure({
        useStyle: false,
      }),
      NodeColor.configure({
        useStyle: false,
      }),
      NodeFit.configure({
        useStyle: false,
      }),
      NodeClearContents,
      TableKit.configure({
        table: false,
      }),

      TableContextExtension.configure({
        resizable: true,
        handleWidth: 1,
      }),
      TableWrapperNode,
      Column,
      ColumnBlock,
      // CommentExtension
    ],
    content,
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight,
  });

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      // eslint-disable-next-line
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  useScrollToAnchor({ editor });

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <ToastProvider>
          <Toolbar
            ref={toolbarRef}
            style={{
              ...(isMobile
                ? {
                    bottom: `calc(100% - ${height - rect.y}px)`,
                  }
                : {}),
            }}
          >
            {mobileView === "main" ? (
              <MainToolbarContent
                // onHighlighterClick={() => setMobileView("highlighter")}
                // onLinkClick={() => setMobileView("link")}
                isMobile={isMobile}
              />
            ) : (
              <MobileToolbarContent
                type={mobileView === "highlighter" ? "highlighter" : "link"}
                onBack={() => setMobileView("main")}
              />
            )}
          </Toolbar>

          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content"
          />
          <ColumnDragHandle editor={editor} />
          <DragHandle editor={editor} />

          <BubbleMenu editor={editor} />

          <ImageBubble editor={editor} />

          <ThreadSidebar editor={editor} />

          <TocSidebar topOffset={80} maxShowCount={20} />
        </ToastProvider>
      </EditorContext.Provider>
    </div>
  );
}

export function SimpleEditor() {
  return (
    <TocProvider>
      <SimpleEditorInner />
    </TocProvider>
  );
}
