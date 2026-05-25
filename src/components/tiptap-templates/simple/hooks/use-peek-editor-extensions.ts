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
import { Column, ColumnBlock } from "src/components/tiptap-node/column-node";
import { TableKit } from "@tiptap/extension-table";
import { TableContextExtension } from "src/components/tiptap-node/table-node";
import { TableWrapperNode } from "src/components/tiptap-node/table-node/extensions/table-context";
import { Figure, FigureCaption } from "src/components/tiptap-node/figure-node";
import { ImageUploadNode } from "src/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { PageLinkNode } from "src/components/tiptap-node/page-link-node";
import { SlashCommand } from "src/components/tiptap-ui/slash-menu";
import { MentionExtension } from "src/components/tiptap-ui/mention-menu";
import { EmojiExtension } from "src/components/tiptap-ui/emoji-menu";
import { handleImageUpload, MAX_FILE_SIZE } from "src/lib/tiptap-utils";
import { DatabaseNode } from "src/components/tiptap-node/inline-database";
import { DatabaseRecordNode } from "src/components/tiptap-node/inline-database/nodes/database-record-node";
import { TitleCellNode } from "src/components/tiptap-node/inline-database/nodes/title-cell-node";
import { SelectCellNode } from "src/components/tiptap-node/inline-database/nodes/select-cell-node";
import { CheckboxCellNode } from "src/components/tiptap-node/inline-database/nodes/checkbox-cell-node";
import { SelectPropertyNode } from "src/components/tiptap-node/database-node/select-property-node";
import { AudioExtension } from "src/components/tiptap-node/audio-node";

export function usePeekEditorExtensions(onNavigate?: (pageId: number) => void) {
  const extensions = useMemo(
    () => [
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
      TableKit.configure({ table: false }),
      TableContextExtension.configure({ resizable: true, handleWidth: 1 }),
      TableWrapperNode,
      SlashCommand,
      MentionExtension,
      EmojiExtension,
      PageLinkNode.configure({
        onNavigate: (pageId) => onNavigate?.(pageId),
      }),
      SelectPropertyNode,
      CheckboxCellNode,
      TitleCellNode,
      SelectCellNode,
      DatabaseRecordNode,
      DatabaseNode,
      CalloutExtension,
      AudioExtension,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { extensions };
}
