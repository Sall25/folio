// slash-commands.ts
import { Editor } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Bookmark,
  Box,
  Code2,
  Columns2,
  Columns3,
  Columns4,
  Database,
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
  Milestone,
  Minus,
  MousePointerClick,
  NotebookTabs,
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
  description?: string;
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
    description: "Just start writing with plain text.",
    icon: Pilcrow,
    isActive: (e) => e.isActive("paragraph"),
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: "h1",
    type: "command",
    title: "Heading 1",
    description: "Big section heading.",
    icon: Heading1,
    isActive: (e) => e.isActive("heading", { level: 1 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 1 }).run(),
  },
  {
    id: "h2",
    type: "command",
    title: "Heading 2",
    description: "Medium section heading.",
    icon: Heading2,
    isActive: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 2 }).run(),
  },
  {
    id: "h3",
    type: "command",
    title: "Heading 3",
    description: "Small section heading.",
    icon: Heading3,
    isActive: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 3 }).run(),
  },
  {
    id: "h4",
    type: "command",
    title: "Heading 4",
    description: "Smaller section heading.",
    icon: Heading4,
    isActive: (e) => e.isActive("heading", { level: 4 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 4 }).run(),
  },
  {
    id: "h5",
    type: "command",
    title: "Heading 5",
    description: "Tiny section heading.",
    icon: Heading5,
    isActive: (e) => e.isActive("heading", { level: 5 }),
    run: (e) => e.chain().focus().setNode("heading", { level: 5 }).run(),
  },
  {
    id: "h6",
    type: "command",
    title: "Heading 6",
    description: "Smallest section heading.",
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
    description: "Create a simple bullet list.",
    icon: List,
    isActive: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    type: "command",
    title: "Numbered List",
    description: "Create a list with numbering.",
    icon: ListOrdered,
    isActive: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "taskList",
    type: "command",
    title: "To-do List",
    description: "Track tasks with a checklist.",
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
    description: "Visually divide blocks.",
    icon: Minus,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "breadcrumb",
    type: "command",
    title: "Breadcrumb",
    description: "Show this page's location.",
    icon: Milestone,
    run: (e) => e.chain().focus().insertBreadcrumb().run(),
  },
  {
    id: "quote",
    type: "command",
    title: "Blockquote",
    description: "Capture a quote.",
    icon: Quote,
    isActive: (e) => e.isActive("blockquote"),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    type: "command",
    title: "Code block",
    description: "Capture a code snippet.",
    icon: CodeBlockIcon,
    isActive: (e) => e.isActive("codeBlock"),
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },

  {
    id: "table",
    type: "command",
    title: "Table",
    description: "Add a simple table.",
    icon: Table,
    run: (e) => e.chain().focus().insertTable({ withHeaderRow: false }).run(),
  },
  {
    id: "toc",
    type: "command",
    title: "Table of Contents",
    description: "Outline of your page's headings.",
    icon: List,
    run: (e) => e.chain().focus().insertTocNode().run(),
  },
  {
    id: "column2",
    type: "command",
    title: "Columns 2",
    description: "Two columns side by side.",
    icon: Columns2,
    run: (e) => e.chain().focus().insertColumns(2).run(),
  },
  {
    id: "column3",
    type: "command",
    title: "Columns 3",
    description: "Three columns side by side.",
    icon: Columns3,
    run: (e) => e.chain().focus().insertColumns(3).run(),
  },
  {
    id: "column4",
    type: "command",
    title: "Columns 4",
    description: "Four columns side by side.",
    icon: Columns4,
    run: (e) => e.chain().focus().insertColumns(4).run(),
  },
  {
    id: "tabs",
    type: "command",
    title: "Tabs",
    description: "Organize content in Tabs",
    icon: NotebookTabs,
    run: (e) => e.chain().focus().insertTabs().run(),
  },
  {
    id: "codeGroup",
    type: "command",
    title: "Code Group",
    description: "Tabbed code samples by language.",
    icon: Code2,
    run: (e) => e.chain().focus().insertCodeGroup().run(),
  },

  // ─── Inline ─────────────────────────────────────────────
  { id: "insertDivider", type: "separator", title: "separator" },
  {
    id: "mention",
    type: "command",
    title: "Mention",
    description: "Link to a person or page.",
    icon: AtSign,
    run: (e) => e.chain().focus().insertContent("@").run(),
  },
  {
    id: "emoji",
    type: "command",
    title: "Emoji",
    description: "Search and insert an emoji.",
    icon: Smile,
    run: (e) => e.chain().focus().insertContent(":").run(),
  },
  {
    id: "mathBlock",
    type: "command",
    title: "Block equation",
    description: "Display a standalone equation.",
    icon: Sigma,
    run: (e) => e.chain().focus().insertMathBlock().run(),
  },
  {
    id: "mathInline",
    type: "command",
    title: "Inline equation",
    description: "Insert math inside text.",
    icon: Sigma,
    run: (e) => e.chain().focus().insertInlineMath().run(),
  },

  // ─── Upload ─────────────────────────────────────────────
  { id: "upload", type: "title", title: "Upload" },
  {
    id: "image",
    type: "command",
    title: "Image",
    description: "Upload or embed an image.",
    icon: Image,
    run: (e) => e.chain().focus().insertContent({ type: "imageUpload" }).run(),
  },
  {
    id: "file",
    type: "command",
    title: "File",
    description: "Upload a file attachment.",
    icon: Paperclip,
    run: (e) => e.chain().focus().insertContent({ type: "file" }).run(),
  },
  {
    id: "Youtube",
    type: "command",
    title: "Youtube",
    description: "Embed a YouTube video.",
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
    description: "Save a link as a visual card.",
    icon: Bookmark,
    run: (e) => e.chain().focus().insertBookmark().run(),
  },
  //  ─── Pages ─────────────────────────────────────────────
  {
    id: "page-1",
    type: "command",
    title: "Page",
    description: "Create a nested sub-page.",
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
    description: "Embed an audio clip.",
    icon: Play,
    run: (e) => e.chain().focus().insertAudio().run(),
  },
  // ─── Callout ─────────────────────────────────────────────
  {
    id: "callout",
    type: "command",
    title: "Callout",
    description: "Make text stand out in a box.",
    icon: TypeOutline,
    run: (e) => e.chain().focus().insertCallout().run(),
  },
  // ─── Button ─────────────────────────────────────────────
  {
    id: "button",
    type: "command",
    title: "Button",
    description: "A call-to-action button.",
    icon: MousePointerClick,
    run: (e) => e.chain().focus().insertButton().run(),
  },
  // ───Container ─────────────────────────────────────────────
  {
    id: "container",
    type: "command",
    title: "Container",
    description: "Flexible box to group blocks",
    icon: Box,
    run: (editor) => editor.chain().focus().insertContainer().run(),
  },
  //  ─── Database ─────────────────────────────────────────────
  {
    id: "database-view",
    type: "command",
    title: "Inline Database",
    description: "Insert a table, board, or list.",
    icon: Database,
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
