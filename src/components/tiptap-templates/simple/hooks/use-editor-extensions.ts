import { TableOfContents } from "@tiptap/extension-table-of-contents";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "src/components/tiptap-node/image-node/image";
import {
  BulletList,
  ListItem,
  OrderedList,
  TaskItem,
  TaskList,
} from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { TableKit } from "@tiptap/extension-table";
import UniqueID from "@tiptap/extension-unique-id";
import { SlashCommand } from "src/components/tiptap-ui/slash-menu";
import { MentionExtension } from "src/components/tiptap-ui/mention-menu";
import { EmojiExtension } from "src/components/tiptap-ui/emoji-menu";
import { CommentThreadExtension } from "src/components/tiptap-ui/comments/extensions/comment-thread-extension";
import DragHandleExtension from "src/components/tiptap-ui/drag-handle/drag-handle-extension";
import {
  NodeBackground,
  NodeAlignment,
  NodeClearContents,
  NodeColor,
  NodeFit,
} from "src/components/tiptap-extension";

import { ImageUploadNode } from "src/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { ParagraphNode } from "src/components/tiptap-node/paragraph-node";
//import { Figure, FigureCaption } from "src/components/tiptap-node/figure-node";
import { TableContextExtension } from "src/components/tiptap-node/table-node";
import { TableWrapperNode } from "src/components/tiptap-node/table-node/extensions/table-context";
import { Column, ColumnBlock } from "src/components/tiptap-node/column-node";
import { TocNode } from "src/components/tiptap-node/toc-node/toc-node-extension";
import {
  DatabaseCellNode,
  DatabaseNode,
  DatabaseRecordNode,
} from "src/components/tiptap-node/inline-database/nodes/database-node";

import { handleImageUpload, MAX_FILE_SIZE } from "src/lib/tiptap-utils";
import { TitleNode } from "src/components/tiptap-node/title-node";
import { useMemo } from "react";
import { PageLinkNode } from "src/components/tiptap-node/page-link-node";
import { DiffExtension } from "src/components/tiptap-ui/version-history";
import type { EditorExtensionRefs } from "../context/editor-extension-refs";
import { CodeBlockNode } from "src/components/tiptap-node/code-block-node";
import { CalloutExtension } from "src/components/tiptap-node/callout-node";
import { AudioExtension } from "src/components/tiptap-node/audio-node";
import { YoutubeExtension } from "src/components/tiptap-node/video-node";
import { BookmarkNode } from "src/components/tiptap-node/bookmark-node/bookmark-node-extension";
import { RecordPropertyPanelNode } from "../record-property-panel-node";
import { MathInlineNode } from "src/components/tiptap-node/math-inline-node";
import { MathBlockNode } from "src/components/tiptap-node/math-block-node";
import { FileNode } from "src/components/tiptap-node/file-node";
import { BreadcrumbNode } from "src/components/tiptap-node/breadcrumb-node";
import { Tab, Tabs } from "src/components/tiptap-node/tabs-node";
import {
  CodeGroup,
  CodeGroupItem,
} from "src/components/tiptap-node/code-group-node";
import { ButtonNode } from "src/components/tiptap-node/button-node";
import { Container } from "src/components/tiptap-node/container-node";
import {
  Appendix,
  AppendixContent,
  AppendixSummary,
} from "src/components/tiptap-node/appendix-node";
import { PageComment } from "src/components/tiptap-node/page-comment-node";
import { DatabaseActiveCell } from "src/components/tiptap-node/inline-database/extensions";

export function useEditorExtensions(
  refsRef: React.RefObject<EditorExtensionRefs>,
) {
  const handleNavigate = (href: string) => {
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      refsRef.current?.setActivePageId(href);
    }
  };
  const extensions = useMemo(
    () => [
      // --- Core ---
      StarterKit.configure({
        paragraph: false,
        horizontalRule: false,
        listItem: false,
        bulletList: false,
        orderedList: false,
        link: { openOnClick: false, enableClickSelection: true },
        codeBlock: false,
        undoRedo: false,
      }),
      CodeBlockNode,
      Typography,
      Selection,
      TextStyle,
      Color,
      Superscript,
      Subscript,

      // --- Text formatting ---
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ editor, node, pos }) => {
          if (node.type.name === "appendixSummary") return "Untitled";

          if (node.type.name === "paragraph") {
            const $pos = editor.state.doc.resolve(pos);
            for (let d = $pos.depth; d > 0; d--) {
              if ($pos.node(d).type.name === "appendixContent") {
                return "Appendix content...";
              }
            }
          }

          if (node.type.name === "title") return "New Page";

          if (["tableCell", "tableHeader", "table"].includes(node.type.name))
            return "";

          const isDbPage =
            editor.storage.structuredPageGuard?.isStructuredActivePage?.() ===
            true;
          if (isDbPage && node.type.name === "paragraph") return "";
          if (editor.state.tr.getMeta("/Filter")) return "/Filter";
          return "Write, type '/' from commands...";
        },
        showOnlyCurrent: true,
        showOnlyWhenEditable: true,
      }),
      // --- Lists ---
      BulletList,
      OrderedList,
      ListItem,
      TaskList,
      TaskItem.configure({ nested: true }),

      // --- Nodes ---
      ParagraphNode,
      TitleNode,
      HorizontalRule,

      Image.configure({
        resize: {
          enabled: true,
          directions: ["left", "right"],
          alwaysPreserveAspectRatio: true,
        },
      }),
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      Column,
      ColumnBlock,
      // --- Table ---
      TableKit.configure({ table: false }),
      TableContextExtension.configure({ resizable: true, handleWidth: 1 }),
      TableWrapperNode,

      // --- TOC ---
      TableOfContents.configure({
        anchorTypes: ["heading", "title", "appendixSummary"],
        onUpdate: (content) => {
          queueMicrotask(() => refsRef.current?.setTocContent(content));
        },
      }),
      TocNode.configure({ topOffset: 80, maxShowCount: 20, showTitle: true }),

      // --- Node attributes ---
      NodeBackground.configure({ useStyle: false }),
      NodeAlignment.configure({ useStyle: false }),
      NodeColor.configure({ useStyle: false }),
      NodeFit.configure({ useStyle: false }),
      NodeClearContents,

      // --- Menus / UI extensions ---
      SlashCommand,
      MentionExtension,
      EmojiExtension,

      // --- Collaboration / comments ---
      PageComment,
      CommentThreadExtension,
      PageLinkNode.configure({
        onNavigate: (pageId) => refsRef.current?.setActivePageId(pageId),
      }),
      CalloutExtension,
      UniqueID.configure({
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "figure",
          "codeBlock",
          "table",
          "callout",
        ],
        attributeName: "id",
      }),
      FileNode.configure({
        upload: handleImageUpload,
        accept: "*/*",
        maxSize: 10 * 1024 * 1024,
        limit: 10,
      }),
      DiffExtension,
      DragHandleExtension,
      DatabaseActiveCell,
      DatabaseCellNode,
      DatabaseRecordNode,
      DatabaseNode,

      AudioExtension,
      YoutubeExtension,
      BookmarkNode,
      RecordPropertyPanelNode,
      MathInlineNode,
      MathBlockNode,
      BreadcrumbNode,
      Tabs,
      Tab,
      CodeGroup,
      CodeGroupItem,
      ButtonNode,
      Container.configure({ onNavigate: handleNavigate }),
      Appendix,
      AppendixSummary,
      AppendixContent,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { extensions };
}
