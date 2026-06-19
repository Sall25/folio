// slash-commands.ts
import { Editor } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Bookmark,
  Columns2,
  Columns3,
  Columns4,
  File,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  List,
  ListOrdered,
  Minus,
  Paperclip,
  Pilcrow,
  Play,
  Quote,
  Sigma,
  Smile,
  Table,
  TypeOutline,
  Video,
} from "lucide-react";
import { TodoListIcon, CodeBlockIcon } from "src/components/tiptap-icons";
import type { Page } from "src/types";

export type SlashItemType = "command" | "title" | "separator";

type Options = {
  activePageId: number;
  addPageAsync: (data: {
    title: string;
    parentId: number | null;
  }) => Promise<Page>;
  setActivePageId: (pageId: number | number) => void;
  isSwitching: boolean;
};

export interface SlashCommand {
  id: string;
  type: SlashItemType;
  title: string;
  icon?: LucideIcon;
  highlightColor?: string;
  textColor?: string;
  isActive?: (editor: Editor) => boolean;
  run?: (editor: Editor, page?: Page) => void;
  runAsync?: (editor: Editor, options: Options) => Promise<void>;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // ─── Text ───────────────────────────────────────────────
  { id: "style", type: "title", title: "Style" },
  {
    id: "p",
    type: "command",
    title: "Text",
    icon: Pilcrow,
    isActive: (e) => e.isActive("paragraph"),
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: "h1",
    type: "command",
    title: "Heading 1",
    icon: Heading1,
    isActive: (e) => e.isActive("heading", { level: 1 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 1 }).run(),
  },
  {
    id: "h2",
    type: "command",
    title: "Heading 2",
    icon: Heading2,
    isActive: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 2 }).run(),
  },
  {
    id: "h3",
    type: "command",
    title: "Heading 3",
    icon: Heading3,
    isActive: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 3 }).run(),
  },
  {
    id: "h4",
    type: "command",
    title: "Heading 4",
    icon: Heading4,
    isActive: (e) => e.isActive("heading", { level: 4 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 4 }).run(),
  },
  {
    id: "h5",
    type: "command",
    title: "Heading 5",
    icon: Heading5,
    isActive: (e) => e.isActive("heading", { level: 5 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 5 }).run(),
  },
  {
    id: "h6",
    type: "command",
    title: "Heading 6",
    icon: Heading6,
    isActive: (e) => e.isActive("heading", { level: 6 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 6 }).run(),
  },

  // ─── Lists ──────────────────────────────────────────────
  { id: "styleDivider", type: "separator", title: "separator" },
  {
    id: "bulletList",
    type: "command",
    title: "Bullet List",
    icon: List,
    isActive: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    type: "command",
    title: "Numbered List",
    icon: ListOrdered,
    isActive: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "taskList",
    type: "command",
    title: "To-do List",
    icon: TodoListIcon,
    isActive: (e) => e.isActive("taskList"),
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },

  // ─── Blocks ─────────────────────────────────────────────
  { id: "insert", type: "title", title: "Insert" },
  {
    id: "separator",
    type: "command",
    title: "Separator",
    icon: Minus,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "quote",
    type: "command",
    title: "Blockquote",
    icon: Quote,
    isActive: (e) => e.isActive("blockquote"),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    type: "command",
    title: "Code block",
    icon: CodeBlockIcon,
    isActive: (e) => e.isActive("codeBlock"),
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },

  {
    id: "table",
    type: "command",
    title: "Table",
    icon: Table,
    run: (e) => e.chain().focus().insertTable({ withHeaderRow: false }).run(),
  },
  {
    id: "toc",
    type: "command",
    title: "Table of Contents",
    icon: List,
    run: (e) => e.chain().focus().insertTocNode().run(),
  },
  {
    id: "column2",
    type: "command",
    title: "Columns 2",
    icon: Columns2,
    run: (e) => e.chain().focus().insertColumns(2).run(),
  },
  {
    id: "column3",
    type: "command",
    title: "Columns 3",
    icon: Columns3,
    run: (e) => e.chain().focus().insertColumns(3).run(),
  },
  {
    id: "column4",
    type: "command",
    title: "Columns 4",
    icon: Columns4,
    run: (e) => e.chain().focus().insertColumns(4).run(),
  },

  // ─── Inline ─────────────────────────────────────────────
  { id: "insertDivider", type: "separator", title: "separator" },
  {
    id: "mention",
    type: "command",
    title: "Mention",
    icon: AtSign,
    run: (e) => e.chain().focus().insertContent("@").run(),
  },
  {
    id: "emoji",
    type: "command",
    title: "Emoji",
    icon: Smile,
    run: (e) => e.chain().focus().insertContent(":").run(),
  },
  {
    id: "mathBlock",
    type: "command",
    title: "Block equation",
    icon: Sigma,
    run: (e) => e.chain().focus().insertMathBlock().run(),
  },
  {
    id: "mathInline",
    type: "command",
    title: "Inline equation",
    icon: Sigma,
    run: (e) => e.chain().focus().insertInlineMath().run(),
  },

  // ─── Upload ─────────────────────────────────────────────
  { id: "upload", type: "title", title: "Upload" },
  {
    id: "image",
    type: "command",
    title: "Image",
    icon: Image,
    run: (e) => e.chain().focus().insertContent({ type: "imageUpload" }).run(),
  },
  {
    id: "file",
    type: "command",
    title: "File",
    icon: Paperclip,
    run: (e) => e.chain().focus().insertContent({ type: "file" }).run(),
  },
  {
    id: "Youtube",
    type: "command",
    title: "Youtube",
    icon: Video,
    run: (e) =>
      e
        .chain()
        .focus()
        .insertContent({ type: "youtube", attrs: { src: null } })
        .run(),
  },
  {
    id: "bookmark",
    type: "command",
    title: "Web bookmark",
    icon: Bookmark,
    run: (e) => e.chain().focus().insertBookmark().run(),
  },
  //  ─── Pages ─────────────────────────────────────────────
  {
    id: "page-1",
    type: "command",
    title: "Page",
    icon: File,
    runAsync: async (editor) => {
      const parentId = editor.storage.slashCommand.activePageId;

      const newPage = await editor.storage.slashCommand.addPageAsync({
        title: "New Page",
        parentId: parentId,
      });

      editor.storage.pageLink.pages = [
        ...editor.storage.pageLink.pages,
        newPage,
      ];

      editor.commands.insertContent({
        type: "pageLink",
        attrs: {
          pageId: newPage.id,
          parentId: parentId,
          title: newPage.title,
        },
      });

      // setActivePageId(newPage.id as number);
    },
  },
  // ─── Audio ─────────────────────────────────────────────
  {
    id: "audio",
    type: "command",
    title: "Audio",
    icon: Play,
    run: (e) => e.chain().focus().insertAudio().run(),
  },
  // ─── Callout ─────────────────────────────────────────────
  {
    id: "callout",
    type: "command",
    title: "Callout",
    icon: TypeOutline,
    run: (e) => e.chain().focus().insertCallout().run(),
  },
  //  ─── Database ─────────────────────────────────────────────
  {
    id: "database-view",
    type: "command",
    title: "Inline Database",
    run: (e) => e.chain().focus().insertDatabaseNode().run(),
  },
  //  ─── Colors ─────────────────────────────────────────────
  // { id: "colorsDivider", type: "separator", title: "separator" },
  // { id: "colors", type: "title", title: "Colors" },
  {
    id: "color-red",
    type: "command",
    title: "Red",
    highlightColor: "var(--tt-color-highlight-red)",
    run: (e) =>
      e
        .chain()
        .focus()
        .toggleNodeBackgroundColor("var(--tt-color-highlight-red)")
        .run(),
  },
  {
    id: "color-text-red",
    type: "command",
    title: "Red",
    textColor: "var(--tt-color-text-red)",
    run: (e) =>
      e.chain().focus().toggleNodeColor("var(--tt-color-text-red)").run(),
  },
  {
    id: "color-orange",
    type: "command",
    title: "Orange",
    highlightColor: "var(--tt-color-highlight-orange)",
    run: (e) =>
      e
        .chain()
        .focus()
        .toggleNodeBackgroundColor("var(--tt-color-highlight-orange)")
        .run(),
  },
  {
    id: "color-text-orange",
    type: "command",
    title: "Orange",
    textColor: "var(--tt-color-text-orange)",
    run: (e) =>
      e.chain().focus().toggleNodeColor("var(--tt-color-text-orange)").run(),
  },
  {
    id: "color-yellow",
    type: "command",
    title: "Yellow",
    highlightColor: "var(--tt-color-highlight-yellow)",
    run: (e) =>
      e
        .chain()
        .focus()
        .toggleNodeBackgroundColor("var(--tt-color-highlight-yellow)")
        .run(),
  },
  {
    id: "color-text-yellow",
    type: "command",
    title: "Yellow",
    textColor: "var(--tt-color-text-yellow)",
    run: (e) =>
      e.chain().focus().toggleNodeColor("var(--tt-color-text-yellow)").run(),
  },
  {
    id: "color-green",
    type: "command",
    title: "Green",
    highlightColor: "var(--tt-color-highlight-green)",
    run: (e) =>
      e
        .chain()
        .focus()
        .toggleNodeBackgroundColor("var(--tt-color-highlight-green)")
        .run(),
  },
  {
    id: "color-text-green",
    type: "command",
    title: "Green",
    textColor: "var(--tt-color-text-green)",
    run: (e) =>
      e.chain().focus().toggleNodeColor("var(--tt-color-text-green)").run(),
  },
  {
    id: "color-blue",
    type: "command",
    title: "Blue",
    highlightColor: "var(--tt-color-highlight-blue)",
    run: (e) =>
      e
        .chain()
        .focus()
        .toggleNodeBackgroundColor("var(--tt-color-highlight-blue)")
        .run(),
  },
  {
    id: "color-text-blue",
    type: "command",
    title: "Blue",
    textColor: "var(--tt-color-text-blue)",
    run: (e) =>
      e.chain().focus().toggleNodeColor("var(--tt-color-text-blue)").run(),
  },
  {
    id: "color-purple",
    type: "command",
    title: "Purple",
    highlightColor: "var(--tt-color-highlight-purple)",
    run: (e) =>
      e
        .chain()
        .focus()
        .toggleNodeBackgroundColor("var(--tt-color-highlight-purple)")
        .run(),
  },
  {
    id: "color-text-purple",
    type: "command",
    title: "Purple",
    textColor: "var(--tt-color-text-purple)",
    run: (e) =>
      e.chain().focus().toggleNodeColor("var(--tt-color-text-purple)").run(),
  },
];
