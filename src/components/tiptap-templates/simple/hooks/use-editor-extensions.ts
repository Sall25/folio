import { TableOfContents } from "@tiptap/extension-table-of-contents";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
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
import { Figure, FigureCaption } from "src/components/tiptap-node/figure-node";
import { TableContextExtension } from "src/components/tiptap-node/table-node";
import { TableWrapperNode } from "src/components/tiptap-node/table-node/extensions/table-context";
import { Column, ColumnBlock } from "src/components/tiptap-node/column-node";
import { TocNode } from "src/components/tiptap-node/toc-node/toc-node-extension";
import { DatabaseNode } from "src/components/tiptap-node/database-node";

import { handleImageUpload, MAX_FILE_SIZE } from "src/lib/tiptap-utils";
import type { TocItem } from "src/components/tiptap-node/toc-node/toc-context";
import { TitleNode } from "src/components/tiptap-node/title-node";
import { useThreadSetup } from "./use-thread-setup";
import { useMemo } from "react";
import { PageLinkNode } from "src/components/tiptap-node/page-link-node";
import { useActivePageId } from "../context/active-page-context";
import { DiffExtension } from "src/components/tiptap-ui/version-history";

export function useEditorExtensions(
  setTocContent: (content: TocItem[]) => void,
) {
  const {
    threads,
    onCreateThreadAsync,
    onDeleteThreadAsync,
    onResolveThreadAsync,
    onUnresolveThreadAsync,
    onAddCommentsAsync,
    onRemoveCommentsAsync,
    onUpdateCommentAsync,
  } = useThreadSetup();

  const { setActivePageId } = useActivePageId();

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
      }),
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
        placeholder: ({ editor, node }) => {
          if (node.type.name === "title") return "New Page";
          if (["tableCell", "tableHeader", "table"].includes(node.type.name))
            return "";
          if (editor.state.tr.getMeta("/Filter")) return "/Filter";
          return "Write, type '/' from commands...";
        },
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
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      Column,
      ColumnBlock,
      DatabaseNode,

      // --- Table ---
      TableKit.configure({ table: false }),
      TableContextExtension.configure({ resizable: true, handleWidth: 1 }),
      TableWrapperNode,

      // --- TOC ---
      TableOfContents.configure({
        onUpdate: setTocContent,
        anchorTypes: ["heading", "title"],
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
      CommentThreadExtension.configure({
        threads,
        onCreateThreadAsync,
        onDeleteThreadAsync,
        onResolveThreadAsync,
        onUnresolveThreadAsync,
        onAddCommentsAsync,
        onRemoveCommentsAsync,
        onUpdateCommentAsync,
      }),
      PageLinkNode.configure({
        onNavigate(pageId) {
          setActivePageId(pageId);
        },
      }),
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
      DiffExtension,
      DragHandleExtension,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { extensions };
}
