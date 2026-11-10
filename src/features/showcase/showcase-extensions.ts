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
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";
import { Image } from "src/components/tiptap-node/image-node/image";
import { ParagraphNode } from "src/components/tiptap-node/paragraph-node";
import { TitleNode } from "src/components/tiptap-node/title-node";
import { HorizontalRule } from "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { CodeBlockNode } from "src/components/tiptap-node/code-block-node";
import { CalloutExtension } from "src/components/tiptap-node/callout-node";
import { Column, ColumnBlock } from "src/components/tiptap-node/column-node";
import { TableContextExtension } from "src/components/tiptap-node/table-node";
import { TableWrapperNode } from "src/components/tiptap-node/table-node/extensions/table-context";
import { MathInlineNode } from "src/components/tiptap-node/math-inline-node";
import { MathBlockNode } from "src/components/tiptap-node/math-block-node";
import { Tab, Tabs } from "src/components/tiptap-node/tabs-node";
import {
  CodeGroup,
  CodeGroupItem,
} from "src/components/tiptap-node/code-group-node";
import {
  Appendix,
  AppendixContent,
  AppendixSummary,
} from "src/components/tiptap-node/appendix-node";
import {
  NodeAlignment,
  NodeBackground,
  NodeColor,
} from "src/components/tiptap-extension";
import { Placeholder } from "@tiptap/extensions";
import { ButtonNode } from "src/components/tiptap-node/button-node";
import { Container } from "src/components/tiptap-node/container-node";
import { QuestionExtension } from "src/components/tiptap-node/question-node";
import { SlashCommand } from "src/components/tiptap-ui/slash-menu";
import { getSlashCommands } from "src/components/tiptap-ui/slash-menu/slash-commands";
import i18n from "src/i18n/config";

// Extensions for showcase pages: the same nodes and marks as the page
// editor, minus everything that needs a signed-in user or the app's
// providers (collaboration, comments, databases, page links, uploads,
// slash / mention menus, table of contents). Showcases are shown read-only
// on the landing page too, where none of those providers exist.
//
// Created once at module level: the list never changes.
export const SHOWCASE_EXTENSIONS = [
  StarterKit.configure({
    // The line that shows where a dragged block lands: 4px, so it's easy
    // to see (the default is 1px; CSS can't override its inline height).
    dropcursor: { width: 4 },
    paragraph: false,
    horizontalRule: false,
    listItem: false,
    bulletList: false,
    orderedList: false,
    codeBlock: false,
    undoRedo: false,
    link: { openOnClick: true, enableClickSelection: false },
  }),
  CodeBlockNode,
  Typography,
  TextStyle,
  Color,
  Superscript,
  Subscript,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight.configure({ multicolor: true }),
  BulletList,
  OrderedList,
  ListItem,
  TaskList,
  TaskItem.configure({ nested: true }),
  ParagraphNode,
  TitleNode,
  HorizontalRule,
  Image,
  Column,
  ColumnBlock,
  TableKit.configure({ table: false }),
  TableContextExtension.configure({ resizable: false, handleWidth: 1 }),
  TableWrapperNode,
  CalloutExtension,
  MathInlineNode,
  MathBlockNode,
  Tabs,
  Tab,
  CodeGroup,
  CodeGroupItem,
  Appendix,
  AppendixSummary,
  AppendixContent,
  ButtonNode,
  Container,
  NodeBackground.configure({ useStyle: false }),
  NodeAlignment.configure({ useStyle: false }),
  NodeColor.configure({ useStyle: false }),
  // Question blocks show (read-only, unanswerable without a page) instead of
  // breaking a published page that has one.
  QuestionExtension,
];

// Editable variant, for the landing's live editor and "Try it" examples:
// the same nodes plus the slash menu (limited to the blocks above) and a
// placeholder. Nothing here saves anything.

const EDITABLE_SLASH_IDS = new Set([
  "style",
  "p",
  "h1",
  "h2",
  "h3",
  "styleDivider",
  "bulletList",
  "orderedList",
  "taskList",
  "insert",
  "separator",
  "quote",
  "codeBlock",
  "table",
  "column2",
  "column3",
  "tabs",
  "codeGroup",
  "insertDivider",
  "mathBlock",
  "mathInline",
  "callout",
  "appendix",
]);

/** Slash items the showcase editor can actually run (and the color ones). */
const isShowcaseSlashItem = (c: { id: string }) =>
  EDITABLE_SLASH_IDS.has(c.id) || c.id.startsWith("color-");

export function showcaseSlashCommands() {
  return getSlashCommands(i18n.t).filter(isShowcaseSlashItem);
}

export function makeEditableShowcaseExtensions() {
  return [
    ...SHOWCASE_EXTENSIONS,
    SlashCommand.configure({
      commands: showcaseSlashCommands(),
      filter: isShowcaseSlashItem,
    }),
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: true,
      placeholder: ({ node }) => {
        if (node.type.name === "title")
          return i18n.t("page.untitled", "Untitled");
        return i18n.t("landing.typeSlash", "Type / for blocks");
      },
    }),
  ];
}
