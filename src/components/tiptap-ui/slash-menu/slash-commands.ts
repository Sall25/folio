import { Editor } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";
import type { TFunction } from "i18next";
import {
  AtSign,
  Bookmark,
  BookMarked,
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

// Build the slash command list with translated titles/descriptions.
// Call from a component: useMemo(() => getSlashCommands(t), [t]).
export function getSlashCommands(t: TFunction): SlashCommand[] {
  return [
    // ─── Text ───────────────────────────────────────────────
    { id: "style", type: "title", title: t("slash.sections.style") },
    {
      id: "p",
      type: "command",
      title: t("slash.items.text.title"),
      description: t("slash.items.text.description"),
      icon: Pilcrow,
      isActive: (e) => e.isActive("paragraph"),
      run: (e) => e.chain().focus().setParagraph().run(),
    },
    {
      id: "h1",
      type: "command",
      title: t("slash.items.h1.title"),
      description: t("slash.items.h1.description"),
      icon: Heading1,
      isActive: (e) => e.isActive("heading", { level: 1 }),
      run: (e) => e.chain().focus().setNode("heading", { level: 1 }).run(),
    },
    {
      id: "h2",
      type: "command",
      title: t("slash.items.h2.title"),
      description: t("slash.items.h2.description"),
      icon: Heading2,
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (e) => e.chain().focus().setNode("heading", { level: 2 }).run(),
    },
    {
      id: "h3",
      type: "command",
      title: t("slash.items.h3.title"),
      description: t("slash.items.h3.description"),
      icon: Heading3,
      isActive: (e) => e.isActive("heading", { level: 3 }),
      run: (e) => e.chain().focus().setNode("heading", { level: 3 }).run(),
    },
    {
      id: "h4",
      type: "command",
      title: t("slash.items.h4.title"),
      description: t("slash.items.h4.description"),
      icon: Heading4,
      isActive: (e) => e.isActive("heading", { level: 4 }),
      run: (e) => e.chain().focus().setNode("heading", { level: 4 }).run(),
    },
    {
      id: "h5",
      type: "command",
      title: t("slash.items.h5.title"),
      description: t("slash.items.h5.description"),
      icon: Heading5,
      isActive: (e) => e.isActive("heading", { level: 5 }),
      run: (e) => e.chain().focus().setNode("heading", { level: 5 }).run(),
    },
    {
      id: "h6",
      type: "command",
      title: t("slash.items.h6.title"),
      description: t("slash.items.h6.description"),
      icon: Heading6,
      isActive: (e) => e.isActive("heading", { level: 6 }),
      run: (e) => e.chain().focus().setNode("heading", { level: 6 }).run(),
    },

    // ─── Lists ──────────────────────────────────────────────
    { id: "styleDivider", type: "separator", title: "separator" },
    {
      id: "bulletList",
      type: "command",
      title: t("slash.items.bulletList.title"),
      description: t("slash.items.bulletList.description"),
      icon: List,
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      id: "orderedList",
      type: "command",
      title: t("slash.items.orderedList.title"),
      description: t("slash.items.orderedList.description"),
      icon: ListOrdered,
      isActive: (e) => e.isActive("orderedList"),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      id: "taskList",
      type: "command",
      title: t("slash.items.taskList.title"),
      description: t("slash.items.taskList.description"),
      icon: TodoListIcon,
      isActive: (e) => e.isActive("taskList"),
      run: (e) => e.chain().focus().toggleTaskList().run(),
    },

    // ─── Blocks ─────────────────────────────────────────────
    { id: "insert", type: "title", title: t("slash.sections.insert") },
    {
      id: "separator",
      type: "command",
      title: t("slash.items.separator.title"),
      description: t("slash.items.separator.description"),
      icon: Minus,
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "breadcrumb",
      type: "command",
      title: t("slash.items.breadcrumb.title"),
      description: t("slash.items.breadcrumb.description"),
      icon: Milestone,
      run: (e) => e.chain().focus().insertBreadcrumb().run(),
    },
    {
      id: "quote",
      type: "command",
      title: t("slash.items.quote.title"),
      description: t("slash.items.quote.description"),
      icon: Quote,
      isActive: (e) => e.isActive("blockquote"),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "codeBlock",
      type: "command",
      title: t("slash.items.codeBlock.title"),
      description: t("slash.items.codeBlock.description"),
      icon: CodeBlockIcon,
      isActive: (e) => e.isActive("codeBlock"),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },

    {
      id: "table",
      type: "command",
      title: t("slash.items.table.title"),
      description: t("slash.items.table.description"),
      icon: Table,
      run: (e) => e.chain().focus().insertTable({ withHeaderRow: false }).run(),
    },
    {
      id: "toc",
      type: "command",
      title: t("slash.items.toc.title"),
      description: t("slash.items.toc.description"),
      icon: List,
      run: (e) => e.chain().focus().insertTocNode().run(),
    },
    {
      id: "column2",
      type: "command",
      title: t("slash.items.column2.title"),
      description: t("slash.items.column2.description"),
      icon: Columns2,
      run: (e) => e.chain().focus().insertColumns(2).run(),
    },
    {
      id: "column3",
      type: "command",
      title: t("slash.items.column3.title"),
      description: t("slash.items.column3.description"),
      icon: Columns3,
      run: (e) => e.chain().focus().insertColumns(3).run(),
    },
    {
      id: "column4",
      type: "command",
      title: t("slash.items.column4.title"),
      description: t("slash.items.column4.description"),
      icon: Columns4,
      run: (e) => e.chain().focus().insertColumns(4).run(),
    },
    {
      id: "tabs",
      type: "command",
      title: t("slash.items.tabs.title"),
      description: t("slash.items.tabs.description"),
      icon: NotebookTabs,
      run: (e) => e.chain().focus().insertTabs().run(),
    },
    {
      id: "codeGroup",
      type: "command",
      title: t("slash.items.codeGroup.title"),
      description: t("slash.items.codeGroup.description"),
      icon: Code2,
      run: (e) => e.chain().focus().insertCodeGroup().run(),
    },

    // ─── Inline ─────────────────────────────────────────────
    { id: "insertDivider", type: "separator", title: "separator" },
    {
      id: "mention",
      type: "command",
      title: t("slash.items.mention.title"),
      description: t("slash.items.mention.description"),
      icon: AtSign,
      run: (e) => e.chain().focus().insertContent("@").run(),
    },
    {
      id: "emoji",
      type: "command",
      title: t("slash.items.emoji.title"),
      description: t("slash.items.emoji.description"),
      icon: Smile,
      run: (e) => e.chain().focus().insertContent(":").run(),
    },
    {
      id: "mathBlock",
      type: "command",
      title: t("slash.items.mathBlock.title"),
      description: t("slash.items.mathBlock.description"),
      icon: Sigma,
      run: (e) => e.chain().focus().insertMathBlock().run(),
    },
    {
      id: "mathInline",
      type: "command",
      title: t("slash.items.mathInline.title"),
      description: t("slash.items.mathInline.description"),
      icon: Sigma,
      run: (e) => e.chain().focus().insertInlineMath().run(),
    },

    // ─── Upload ─────────────────────────────────────────────
    { id: "upload", type: "title", title: t("slash.sections.upload") },
    {
      id: "image",
      type: "command",
      title: t("slash.items.image.title"),
      description: t("slash.items.image.description"),
      icon: Image,
      run: (e) =>
        e.chain().focus().insertContent({ type: "imageUpload" }).run(),
    },
    {
      id: "file",
      type: "command",
      title: t("slash.items.file.title"),
      description: t("slash.items.file.description"),
      icon: Paperclip,
      run: (e) => e.chain().focus().insertContent({ type: "file" }).run(),
    },
    {
      id: "Youtube",
      type: "command",
      title: t("slash.items.youtube.title"),
      description: t("slash.items.youtube.description"),
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
      title: t("slash.items.bookmark.title"),
      description: t("slash.items.bookmark.description"),
      icon: Bookmark,
      run: (e) => e.chain().focus().insertBookmark().run(),
    },
    //  ─── Pages ─────────────────────────────────────────────
    {
      id: "page-1",
      type: "command",
      title: t("slash.items.page.title"),
      description: t("slash.items.page.description"),
      icon: File,
      runAsync: async (editor) => {
        const parentId = editor.storage.slashCommand.activePageId;

        const newPage = await editor.storage.slashCommand.addPageAsync({
          title: t("page.newPage"),
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
      title: t("slash.items.audio.title"),
      description: t("slash.items.audio.description"),
      icon: Play,
      run: (e) => e.chain().focus().insertAudio().run(),
    },
    // ─── Callout ─────────────────────────────────────────────
    {
      id: "callout",
      type: "command",
      title: t("slash.items.callout.title"),
      description: t("slash.items.callout.description"),
      icon: TypeOutline,
      run: (e) => e.chain().focus().insertCallout().run(),
    },
    // ─── Appendix ─────────────────────────────────────────────
    {
      id: "appendix",
      type: "command",
      title: t("slash.appendix"),
      icon: BookMarked,
      run: (e) => e.chain().focus().insertAppendix().run(),
    },
    // ─── Button ─────────────────────────────────────────────
    {
      id: "button",
      type: "command",
      title: t("slash.items.button.title"),
      description: t("slash.items.button.description"),
      icon: MousePointerClick,
      run: (e) => e.chain().focus().insertButton().run(),
    },
    // ───Container ─────────────────────────────────────────────
    {
      id: "container",
      type: "command",
      title: t("slash.items.container.title"),
      description: t("slash.items.container.description"),
      icon: Box,
      run: (editor) => editor.chain().focus().insertContainer().run(),
    },
    //  ─── Database ─────────────────────────────────────────────
    {
      id: "database-view",
      type: "command",
      title: t("slash.items.database.title"),
      description: t("slash.items.database.description"),
      icon: Database,
      run: (e) => e.chain().focus().insertDatabaseNode().run(),
    },
    //  ─── Colors ─────────────────────────────────────────────
    // { id: "colorsDivider", type: "separator", title: "separator" },
    // { id: "colors", type: "title", title: "Colors" },
    {
      id: "color-red",
      type: "command",
      title: t("slash.colors.red"),
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
      title: t("slash.colors.red"),
      textColor: "var(--tt-color-text-red)",
      run: (e) =>
        e.chain().focus().toggleNodeColor("var(--tt-color-text-red)").run(),
    },
    {
      id: "color-orange",
      type: "command",
      title: t("slash.colors.orange"),
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
      title: t("slash.colors.orange"),
      textColor: "var(--tt-color-text-orange)",
      run: (e) =>
        e.chain().focus().toggleNodeColor("var(--tt-color-text-orange)").run(),
    },
    {
      id: "color-yellow",
      type: "command",
      title: t("slash.colors.yellow"),
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
      title: t("slash.colors.yellow"),
      textColor: "var(--tt-color-text-yellow)",
      run: (e) =>
        e.chain().focus().toggleNodeColor("var(--tt-color-text-yellow)").run(),
    },
    {
      id: "color-green",
      type: "command",
      title: t("slash.colors.green"),
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
      title: t("slash.colors.green"),
      textColor: "var(--tt-color-text-green)",
      run: (e) =>
        e.chain().focus().toggleNodeColor("var(--tt-color-text-green)").run(),
    },
    {
      id: "color-blue",
      type: "command",
      title: t("slash.colors.blue"),
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
      title: t("slash.colors.blue"),
      textColor: "var(--tt-color-text-blue)",
      run: (e) =>
        e.chain().focus().toggleNodeColor("var(--tt-color-text-blue)").run(),
    },
    {
      id: "color-purple",
      type: "command",
      title: t("slash.colors.purple"),
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
      title: t("slash.colors.purple"),
      textColor: "var(--tt-color-text-purple)",
      run: (e) =>
        e.chain().focus().toggleNodeColor("var(--tt-color-text-purple)").run(),
    },
  ];
}
