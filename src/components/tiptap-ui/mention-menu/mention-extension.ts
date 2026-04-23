/* eslint-disable @typescript-eslint/no-explicit-any */

import { Mention } from "@tiptap/extension-mention";
import type { MentionItem, MentionListRef } from "./types";
import {
  Editor,
  posToDOMRect,
  ReactNodeViewRenderer,
  ReactRenderer,
} from "@tiptap/react";
import MentionList from "./mention-list";
import {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { type MentionSuggestion } from "./types";
import {
  computePosition,
  flip,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";
import { users } from "./users";

import "./mention-extension.scss";
import { MentionView } from "./mention-view";
import { flattenPages } from "src/lib/flatten-pages";

const FORBIDDEN_BLOCKS = [
  "codeBlock",
  "table",
  "tableCell",
  "tableHeader",
  "code",
] as const;

const isInForbiddenBlock = (editor: Editor) =>
  FORBIDDEN_BLOCKS.some((block) => editor.isActive(block));

const MentionWithView = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      date: {
        default: null,
      },
      nodeId: { default: null },
      remind: { default: null },
      includeTime: { default: false },
      dateFormat: { default: "relative" }, // "relative" | "absolute"
      endDate: { default: null },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(MentionView);
  },
});

export const MentionExtension = MentionWithView.configure({
  HTMLAttributes: {
    class: "mention",
  },

  suggestion: {
    char: "@",
    startOfLine: false,
    decorationClass: "mention-suggestion",
    allowSpaces: true,

    items: async ({
      query,
      editor,
    }: {
      query: string;
      editor: Editor;
    }): Promise<MentionItem[]> => {
      if (isInForbiddenBlock(editor)) return [];
      const q = query.toLowerCase();
      const pages = editor.storage.pageLink.pages ?? [];

      const matchedUsers = users
        .filter((u) => u.role) // ← only real users have a role
        .filter((u) => u.label.toLowerCase().includes(q));

      const matchedPages = flattenPages(pages)
        .filter((p) => (p.title || "New Page").toLowerCase().includes(q))
        .map((p) => ({
          id: String(p.id),
          label: p.title || "New Page",
          type: "page" as const,
          cover: p.cover,
        }));

      const matchedDates = users
        .filter((u) => u.date)
        .filter((u) => u.label.toLowerCase().includes(q));

      const result: MentionItem[] = [];

      if (matchedPages.length) {
        result.push({
          id: "divider-pages",
          label: "",
          title: "Pages",
          type: "divider",
        });
        result.push(...matchedPages);
      }

      if (matchedDates.length) {
        result.push({
          id: "divider-date",
          label: "",
          title: "Date",
          type: "divider",
        });
        result.push(
          ...matchedDates.map((u) => ({ ...u, type: "date" as const })),
        );
      }
      if (matchedUsers.length) {
        result.push({
          id: "divider-people",
          label: "",
          title: "People",
          type: "divider",
        });
        result.push(
          ...matchedUsers.map((u) => ({ ...u, type: "user" as const })),
        );
      }

      return result;
    },

    command: ({
      editor,
      range,
      props,
    }: {
      editor: any;
      range: any;
      props: any;
    }) => {
      if (props.type === "page") {
        editor.chain().focus().deleteRange(range).run();
        editor.commands.insertContent({
          type: "pageLink",
          attrs: {
            pageId: String(props.id),
            parentId: editor.storage.slashCommand.activePage?.id
              ? String(editor.storage.slashCommand.activePage?.id)
              : null,
            title: "",
            nodeId: `pageLink-${Date.now()}`,
          },
        });
      } else {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "mention",
              attrs: {
                id: props.id,
                label: props.label,
                mentionSuggestionChar: "@",
                nodeId: `mention-${Date.now()}`,
              },
            },
            { type: "text", text: " " },
          ])
          .run();
      }
    },

    render: () => {
      let reactRenderer: ReactRenderer<MentionListRef> | null = null;

      const updatePosition = (editor: Editor, element: HTMLElement) => {
        const virtualEl: VirtualElement = {
          getBoundingClientRect: () =>
            posToDOMRect(
              editor.view,
              editor.state.selection.from,
              editor.state.selection.to,
            ),
        };
        computePosition(virtualEl, element, {
          placement: "bottom-start",
          strategy: "absolute",
          middleware: [shift(), flip()],
        }).then(({ x, y, strategy }) => {
          element.style.width = "max-content";
          element.style.position = strategy;
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
        });
      };

      return {
        onStart: (props: any) => {
          // Don't show the decoration or renderer inside forbidden blocks
          if (isInForbiddenBlock(props.editor)) {
            exitSuggestion(props.editor.view);
            return;
          }

          reactRenderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          reactRenderer.element.style.position = "absolute";

          document.body.appendChild(reactRenderer.element);

          updatePosition(props.editor, reactRenderer.element);

          requestAnimationFrame(() => {
            const el = props.editor.view.dom.querySelector(
              ".mention-suggestion",
            );
            el?.classList.add("is-empty");
          });
        },

        onUpdate(props: any) {
          reactRenderer?.updateProps(props);
          requestAnimationFrame(() => {
            const el = props.editor.view.dom.querySelector(
              ".mention-suggestion",
            );
            if (props.query.length > 0) {
              el?.classList.remove("is-empty");
            } else {
              el?.classList.add("is-empty");
            }
          });
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === "Escape") {
            reactRenderer?.destroy();
            return true;
          }

          return reactRenderer?.ref?.onKeyDown(props) ?? false;
        },

        onExit(props: SuggestionProps<MentionItem>) {
          const { editor, range } = props;
          const { state } = editor;

          const textAtRange = state.doc.textBetween(
            range.from,
            range.to,
            "\0",
            "\0",
          );
          const cursorPos = state.selection.from;

          const stillSlash = textAtRange.startsWith("@");
          const cursorInside =
            cursorPos >= range.from && cursorPos <= range.to + 1;

          if (stillSlash && cursorInside) {
            return;
          }

          reactRenderer?.element.remove();
          reactRenderer?.destroy();
        },
      };
    },
  } satisfies MentionSuggestion,
});
