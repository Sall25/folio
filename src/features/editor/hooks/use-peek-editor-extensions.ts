import "src/lib/safe-node-view-selection";
import { useMemo } from "react";
import { StarterKit } from "@tiptap/starter-kit";
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
import { Image } from "@tiptap/extension-image";

import { ParagraphNode } from "src/components/tiptap-node/paragraph-node";
import { TitleNode } from "src/components/tiptap-node/title-node";
import { HorizontalRule } from "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { CodeBlockNode } from "src/components/tiptap-node/code-block-node";
import { CalloutExtension } from "src/components/tiptap-node/callout-node";
import { PomodoroExtension } from "src/components/tiptap-node/pomodoro-node";
import { PinnableExtension } from "src/features/editor/pins";
import { BlockRefExtension } from "src/components/tiptap-node/block-ref-node";
import { Column, ColumnBlock } from "src/components/tiptap-node/column-node";
import { TableKit } from "@tiptap/extension-table";
import { TableContextExtension } from "src/components/tiptap-node/table-node";
import { TableWrapperNode } from "src/components/tiptap-node/table-node/extensions/table-context";
import { ImageUploadNode } from "src/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { PageLinkNode } from "src/components/tiptap-node/page-link-node";
import { SlashCommand } from "src/components/tiptap-ui/slash-menu";
import { MentionExtension } from "src/components/tiptap-ui/mention-menu";
import { EmojiExtension } from "src/components/tiptap-ui/emoji-menu";
import { handleImageUpload, MAX_FILE_SIZE } from "src/lib/tiptap-utils";
import {
  DatabaseCellNode,
  DatabaseRecordNode,
  DatabaseNode,
} from "src/features/database/nodes/database-node/database-node";
import { AudioExtension } from "src/components/tiptap-node/audio-node";
import { RecordPropertyPanelNode } from "../../database/record-property-panel/record-property-panel-node";
import type { ID } from "src/types";
import { PageComment } from "src/features/comments/page-comment-node";
import { Containment } from "src/components/tiptap-extension/containment-extension";

export function usePeekEditorExtensions(onNavigate?: (pageId: ID) => void) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // The line that shows where a dragged block lands: 4px, so it's easy
        // to see (the default is 1px; CSS can't override its inline height).
        dropcursor: { width: 4 },
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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => {
          if (node.type.name === "title") return "New Page";
          return "Write, type '/' from commands...";
        },
      }),
      BulletList,
      OrderedList,
      ListItem,
      TaskList,
      TaskItem.configure({ nested: true }),
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
      TableKit.configure({ table: false }),
      TableContextExtension.configure({ resizable: true, handleWidth: 1 }),
      TableWrapperNode,
      SlashCommand,
      MentionExtension,
      EmojiExtension,
      PageLinkNode.configure({
        onNavigate: (pageId) => onNavigate?.(pageId),
      }),
      DatabaseCellNode,
      DatabaseRecordNode,
      DatabaseNode,
      Containment,
      CalloutExtension,
      PomodoroExtension,
      PinnableExtension,
      BlockRefExtension,
      AudioExtension,
      RecordPropertyPanelNode,
      PageComment,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { extensions };
}
