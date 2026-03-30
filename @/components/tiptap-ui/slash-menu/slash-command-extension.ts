/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension, posToDOMRect } from "@tiptap/core";
import Suggestion, {
  exitSuggestion,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { Editor } from "@tiptap/core";
import type { Plugin } from "@tiptap/pm/state";
import SlashList, { type SlashItem } from "./slash-command-list";
import {
  AtSign,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Smile,
  Table,
} from "lucide-react";
import {
  computePosition,
  flip,
  offset,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";

import "./slash-command-extension.scss";
import { CodeBlockIcon, TodoListIcon } from "@/components/tiptap-icons";

export const SlashCommand = Extension.create({
  name: "slash-command",

  addOptions() {
    return {
      commands: [
        {
          id: "style",
          title: "Style",
          mark: { type: "title" },
        },
        {
          id: "p",
          title: "Text",
          icon: Pilcrow,
          mark: { type: "paragraph" },
          isActive: (editor) => editor.isActive("paragraph") ?? false,
          run: (editor: Editor) => editor.chain().focus().setParagraph().run(),
        },
        {
          id: "h1",
          title: "Heading 1",
          icon: Heading1,
          mark: { type: "heading", level: 1 },
          isActive: (editor) =>
            editor.isActive("heading", { level: 1 }) ?? false,
          run: (editor: Editor) =>
            editor.chain().focus().setNode("heading", { level: 1 }).run(),
        },
        {
          id: "h2",
          title: "Heading 2",
          icon: Heading2,
          mark: { type: "heading", level: 2 },
          isActive: (editor) =>
            editor.isActive("heading", { level: 2 }) ?? false,
          run: (editor: Editor) =>
            editor.chain().focus().setNode("heading", { level: 2 }).run(),
        },
        {
          id: "h3",
          title: "Heading 3",
          icon: Heading3,
          mark: { type: "heading", level: 3 },
          isActive: (editor) =>
            editor.isActive("heading", { level: 3 }) ?? false,
          run: (editor: Editor) =>
            editor.chain().focus().setNode("heading", { level: 3 }).run(),
        },
        {
          id: "bulletList",
          title: "Bullet List",
          icon: List,
          isActive: (editor) => editor.isActive("bulletList") ?? false,
          run: (editor: Editor) =>
            editor.chain().focus().toggleBulletList().run(),
        },
        {
          id: "orderedList",
          title: "Numbered List",
          icon: ListOrdered,
          isActive: (editor) => editor.isActive("orderedList") ?? false,
          run: (editor: Editor) =>
            editor.chain().focus().toggleOrderedList().run(),
        },
        {
          id: "taskList",
          title: "To-do List",
          icon: TodoListIcon,
          isActive: (editor) => editor.isActive("taskList") ?? false,
          run: (editor: Editor) =>
            editor.chain().focus().toggleTaskList().run(),
        },
        {
          id: "quote",
          title: "Blockquote",
          icon: Quote,
          mark: { type: "blockQuote" },
          isActive: (editor) => editor.isActive("blockquote") ?? false,
          run: (editor: Editor) =>
            editor.chain().focus().toggleBlockquote().run(),
        },
        {
          id: "codeBlock",
          title: "Code block",
          icon: CodeBlockIcon,
          mark: { type: "blockQuote" },
          isActive: (editor) => editor.isActive("codeBlock") ?? false,
          run: (editor: Editor) =>
            editor.chain().focus().toggleCodeBlock().run(),
        },
        {
          id: "styleDivider",
          title: "separator",
          mark: { type: "separator" },
        },
        {
          id: "insert",
          title: "Insert",
          mark: { type: "title" },
        },
        {
          id: "separator",
          title: "Separator",
          icon: Minus,
          run(editor) {
            editor.chain().focus().setHorizontalRule().run();
          },
        },
        {
          id: "mention",
          title: "Mention",
          icon: AtSign,
          run(editor) {
            editor.chain().focus().insertContent("@").run();
          },
        },
        {
          id: "emoji",
          title: "Emoji",
          icon: Smile,
          run(editor) {
            editor.chain().focus().insertContent(":").run();
          },
        },
        {
          id: "table",
          title: "Table",
          icon: Table,
          run(editor) {
            editor.chain().focus().insertTable().run();
          },
        },

        {
          id: "toc",
          title: "Table of Contents",
          icon: List,
          run(editor) {
            editor.chain().focus().insertTocNode().run();
          },
        },
        {
          id: "insertDivider",
          title: "separator",
          mark: { type: "separator" },
        },
        {
          id: "upload",
          title: "Upload",
          mark: { type: "title" },
        },
        {
          id: "image",
          title: "Image",
          icon: Image,
          run: (editor) => {
            editor
              .chain()
              .focus()
              .insertContent({
                type: "imageUpload",
              })
              .run();
          },
        },
      ] as SlashItem[],
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    let reactRenderer: ReactRenderer<any> | null = null;
    let selectedIndex = 0;
    let currentProps: SuggestionProps<SlashItem> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const updatePosition = (element: HTMLElement) => {
      const virtualElement: VirtualElement = {
        getBoundingClientRect: () =>
          posToDOMRect(
            editor.view,
            editor.state.selection.from,
            editor.state.selection.to,
          ),
      };
      computePosition(virtualElement, element, {
        placement: "bottom-start",
        strategy: "absolute",
        middleware: [offset(2), shift(), flip()],
      }).then(({ x, y, strategy }) => {
        element.style.width = "max-content";
        element.style.position = strategy;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
      });
    };

    function createRenderer(props: SuggestionProps<SlashItem>) {
      currentProps = props;
      selectedIndex = 0;

      reactRenderer = new ReactRenderer(SlashList, {
        editor,
        props: {
          ...props,
          selectedIndex,
          onClickItem: (item: SlashItem) => {
            props.command(item);
            exitSuggestion(editor.view);
          },
        },
      });

      reactRenderer.element.style.position = "absolute";

      document.body.appendChild(reactRenderer.element);

      updatePosition(reactRenderer.element);

      // reposition whenever the menu resizes (e.g. after filtering)
      resizeObserver = new ResizeObserver(() => {
        if (reactRenderer) updatePosition(reactRenderer.element);
      });
      resizeObserver.observe(reactRenderer.element);
    }

    function updateRenderer(props: SuggestionProps<SlashItem>) {
      currentProps = props;
      if (!reactRenderer) {
        createRenderer(props);
        return;
      }

      reactRenderer.updateProps({
        ...props,
        selectedIndex,
        onClickItem: (item: SlashItem) => {
          props.command(item);
          exitSuggestion(editor.view);
        },
      });
    }

    function destroyRenderer(props: SuggestionProps<SlashItem>) {
      const { editor, range } = props;
      const { state } = editor;

      const docSize = state.doc.content.size;

      // Bail early if range is completely out of bounds
      if (range.from >= docSize) {
        reactRenderer?.destroy();
        reactRenderer = null;
        currentProps = null;
        return;
      }

      const clampedTo = Math.min(range.to, docSize);

      try {
        const textAtRange = state.doc.textBetween(
          range.from,
          clampedTo,
          "\0",
          "\0",
        );
        const cursorPos = state.selection.from;
        const stillSlash = textAtRange.startsWith("/");
        const cursorInside =
          cursorPos >= range.from && cursorPos <= range.to + 1;

        if (stillSlash && cursorInside) return;
      } catch {
        // Range is stale, just destroy
        console.log("range is stale");
      }

      if (reactRenderer) {
        try {
          reactRenderer.destroy();
          resizeObserver?.disconnect();
          resizeObserver = null;
        } catch {
          console.log("Failed to destroy reactRenderer");
        }
        try {
          if (reactRenderer.element?.parentNode)
            reactRenderer.element.parentNode.removeChild(reactRenderer.element);
        } catch {
          console.log("Failed to remove element");
        }
        reactRenderer = null;
      }
      currentProps = null;
    }

    // function destroyRenderer(props: SuggestionProps<SlashItem>) {
    //   const { editor, range } = props;
    //   const { state } = editor;

    //   const textAtRange = state.doc.textBetween(
    //     range.from,
    //     range.to,
    //     "\0",
    //     "\0",
    //   );
    //   const cursorPos = state.selection.from;

    //   const stillSlash = textAtRange.startsWith("/");
    //   const cursorInside = cursorPos >= range.from && cursorPos <= range.to + 1;

    //   if (stillSlash && cursorInside) {
    //     // Ignore transient exit caused by our own transaction
    //     return;
    //   }

    //   if (reactRenderer) {
    //     try {
    //       reactRenderer.destroy();

    //       if (resizeObserver) {
    //         resizeObserver.disconnect();
    //         resizeObserver = null;
    //       }
    //     } catch {
    //       console.log("Failed to destroy reactRenderer");
    //     }
    //     try {
    //       if (reactRenderer.element?.parentNode)
    //         reactRenderer.element.parentNode.removeChild(reactRenderer.element);
    //     } catch {
    //       console.log("Failed to remove element");
    //     }
    //     reactRenderer = null;
    //   }
    //   currentProps = null;
    // }

    const suggestion = Suggestion<SlashItem>({
      editor,
      char: "/",
      startOfLine: true,
      decorationClass: "slash-suggestion",
      allowSpaces: true,
      decorationContent: "Filter...",
      items: ({ query }) => {
        const q = (query || "").toLowerCase();
        return (this.options.commands as SlashItem[]).filter((c) =>
          c.title.toLowerCase().includes(q),
        );
      },
      command: ({ editor: ed, range, props }) => {
        ed.chain().focus().deleteRange(range).run();
        props.run(ed);
      },
      render: () => ({
        onStart: (props) => {
          createRenderer(props);
          requestAnimationFrame(() => {
            const el = editor.view.dom.querySelector(".slash-suggestion");
            el?.classList.add("is-empty");
          });
        },
        onUpdate: (props) => {
          updateRenderer(props);

          requestAnimationFrame(() => {
            const el = editor.view.dom.querySelector(".slash-suggestion");
            if (props.query.length > 0) {
              el?.classList.remove("is-empty");
            } else {
              el?.classList.add("is-empty");
            }
          });
        },
        onExit: destroyRenderer,
      }),
    });

    return [suggestion as unknown as Plugin];
  },
});
