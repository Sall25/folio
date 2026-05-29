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
import { DatabaseNode } from "src/components/tiptap-node/inline-database/nodes/database-node";

import { handleImageUpload, MAX_FILE_SIZE } from "src/lib/tiptap-utils";
import { TitleNode } from "src/components/tiptap-node/title-node";
import { useMemo } from "react";
import { PageLinkNode } from "src/components/tiptap-node/page-link-node";
import { DiffExtension } from "src/components/tiptap-ui/version-history";
import type { EditorExtensionRefs } from "../context/editor-extension-refs";
import { CodeBlockNode } from "src/components/tiptap-node/code-block-node";
import { SelectPropertyNode } from "src/components/tiptap-node/database-node/select-property-node";
import { CalloutExtension } from "src/components/tiptap-node/callout-node";
import { AudioExtension } from "src/components/tiptap-node/audio-node";
import { DatabaseRecordNode } from "src/components/tiptap-node/inline-database/nodes/database-record-node";
import { TitleCellNode } from "src/components/tiptap-node/inline-database/nodes/title-cell-node";
import { SelectCellNode } from "src/components/tiptap-node/inline-database/nodes/select-cell-node";
import { CheckboxCellNode } from "src/components/tiptap-node/inline-database/nodes/checkbox-cell-node";
import { FileNode } from "src/components/tiptap-node/file-node";
import { EmailCellNode } from "src/components/tiptap-node/inline-database/nodes/email-cell-node";
import { FileCellNode } from "src/components/tiptap-node/inline-database/nodes/file-cell-node";
import { MultiSelectCellNode } from "src/components/tiptap-node/inline-database/nodes/multiselect-cell-node";
import { StatusCellNode } from "src/components/tiptap-node/inline-database/nodes/status-cell-node";
import { NumberCellNode } from "src/components/tiptap-node/inline-database/nodes/number-cell-node";
import { PhoneCellNode } from "src/components/tiptap-node/inline-database/nodes/phone-cell-node";
import { RollupCellNode } from "src/components/tiptap-node/inline-database/nodes/rollup-cell-node";
import { TextCellNode } from "src/components/tiptap-node/inline-database/nodes/text-cell-node";
import { UrlCellNode } from "src/components/tiptap-node/inline-database/nodes/url-cell-node";
import { CreatedTimeCellNode } from "src/components/tiptap-node/inline-database/nodes/created-time-cell-node";
import { EditedTimeCellNode } from "src/components/tiptap-node/inline-database/nodes/edited-time-cell-node";
import { DueDateCellNode } from "src/components/tiptap-node/inline-database/nodes/due-date-cell-node";
import { FormulaCellNode } from "src/components/tiptap-node/inline-database/nodes/formula-cell-node";
import { YoutubeExtension } from "src/components/tiptap-node/video-node";
import { BookmarkNode } from "src/components/tiptap-node/bookmark-node/bookmark-node-extension";
import { PageBreadcrumb } from "src/components/tiptap-ui/page-breadcrumb/page-breadcrumb";
import { RecordPropertyPanelNode } from "src/components/tiptap-node/record-property-panel-node";
import { PersonCellNode } from "src/components/tiptap-node/inline-database/nodes/person-cell-node";

export function useEditorExtensions(
  refsRef: React.RefObject<EditorExtensionRefs>,
) {
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
      // FigureCaption,
      // Figure.configure({
      //   directions: ["left", "right"],
      //   preserveAspectRatio: true,
      //   min: { width: 10, height: 10 },
      //   max: { width: 2000, height: 2000 },
      // }),
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
        onUpdate: (content) => refsRef.current?.setTocContent(content),
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
        threads: [],
        onCreateThreadAsync: async (...args) => {
          await refsRef.current?.createThreadAsync?.(...args);
        },
        onDeleteThreadAsync: async (...args) => {
          await refsRef.current?.deleteThreadAsync?.(...args);
        },
        onResolveThreadAsync: async (...args) => {
          await refsRef.current?.resolveThreadAsync?.(...args);
        },
        onUnresolveThreadAsync: async (...args) => {
          await refsRef.current?.unresolveThreadAsync?.(...args);
        },
        onAddCommentsAsync: async (thread, newComments) => {
          await refsRef.current?.addCommentsAsync?.({ thread, newComments });
        },
        onRemoveCommentsAsync: async (...args) => {
          await refsRef.current?.removeCommentsAsync?.(...args);
        },
        onUpdateCommentAsync: async (...args) => {
          await refsRef.current?.updateCommentAsync?.(...args);
        },
      }),
      PageLinkNode.configure({
        onNavigate: (pageId) => refsRef.current?.setActivePageId(pageId),
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
      FileNode.configure({
        upload: handleImageUpload,
        accept: "*/*",
        maxSize: 10 * 1024 * 1024,
        limit: 10,
      }),
      DiffExtension,
      DragHandleExtension,

      FormulaCellNode,
      EmailCellNode,
      FileCellNode,
      MultiSelectCellNode,
      StatusCellNode,
      NumberCellNode,
      PhoneCellNode,
      PersonCellNode,
      RollupCellNode,
      TextCellNode,
      UrlCellNode,
      CreatedTimeCellNode,
      EditedTimeCellNode,
      DueDateCellNode,
      SelectPropertyNode,
      CheckboxCellNode,
      TitleCellNode,
      SelectCellNode,
      DatabaseRecordNode,
      DatabaseNode,
      CalloutExtension,
      AudioExtension,
      YoutubeExtension,
      BookmarkNode,
      PageBreadcrumb,
      RecordPropertyPanelNode,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { extensions };
}
