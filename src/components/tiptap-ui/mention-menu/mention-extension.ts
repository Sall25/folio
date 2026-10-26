/* eslint-disable @typescript-eslint/no-explicit-any */

import { Mention } from "@tiptap/extension-mention";
import type { MentionItem, MentionListRef, RowMentionEntry } from "./types";
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
import { getDateSuggestions } from "./date-suggestions";

import "./mention-extension.scss";
import { MentionView } from "./mention-view";
import { openInviteMentionPanel } from "./open-invite-mention-panel";
import type { Page, Person } from "src/types";

const FORBIDDEN_BLOCKS = ["codeBlock", "code"] as const;

const isInForbiddenBlock = (editor: Editor) =>
  FORBIDDEN_BLOCKS.some((block) => editor.isActive(block));

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: {
      setMentionPeople: (people: Person[]) => ReturnType;
      setMentionPages: (pages: Page[]) => ReturnType;
      setMentionRows: (rows: RowMentionEntry[]) => ReturnType;
    };
  }
}

interface MentionStorage {
  people: Person[];
  rows: RowMentionEntry[];
  /** Invites people to the workspace by email (set by useMentionData). */
  invite?: (emails: string[], role: "member" | "guest") => Promise<void>;
}

declare module "@tiptap/core" {
  interface Storage {
    mention: MentionStorage;
  }
}

/** Where a page is: its parents' titles, nearest last ("Reading List /
 *  Books"), at most `depth` levels. */
function pagePath(page: Page, byId: Map<string, Page>, depth = 2): string {
  const titles: string[] = [];
  let parentId = page.parentId;
  while (parentId && titles.length < depth) {
    const parent = byId.get(parentId);
    if (!parent) break;
    titles.unshift(parent.title || "New Page");
    parentId = parent.parentId;
  }
  return titles.join(" / ");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      /** A mention of a database row: its page id (MentionView shows it as
       *  a row chip — RowMention). */
      rowId: { default: null },
    };
  },
  addStorage() {
    return {
      ...this.parent?.(),
      people: [],
      rows: [],
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setMentionPeople:
        (people: Person[]) =>
        ({ editor }) => {
          editor.storage.mention.people = people;
          return true;
        },
      setMentionPages:
        (pages: Page[]) =>
        ({ editor }) => {
          editor.storage.pageLink.pages = pages;
          return true;
        },
      setMentionRows:
        (rows: RowMentionEntry[]) =>
        ({ editor }) => {
          editor.storage.mention.rows = rows;
          return true;
        },
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
      const people = editor.storage.mention.people ?? [];

      const matchedUsers = people
        .filter((u) =>
          `${u.name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q),
        )
        .map((p) => ({
          id: String(p.id),
          label: p.name || p.email,
          avatar: p.avatarUrl ?? undefined,
          type: "user" as const,
        }));

      const byId = new Map(pages.map((p) => [p.id, p] as const));
      const matchedPages: MentionItem[] = pages
        .filter((p) => (p.title || "New Page").toLowerCase().includes(q))
        .map((p) => ({
          id: String(p.id),
          label: p.title || "New Page",
          type: "page" as const,
          cover: p.cover,
          path: pagePath(p, byId),
        }));

      // Rows: by title, like pages, or by their ID ("TASK-12", "task-1"…)
      // for those that have one — no need to know it. A few at most: a
      // database can hold hundreds.
      const rows = editor.storage.mention.rows ?? [];
      const matchedRows: MentionItem[] = q
        ? rows
            .filter(
              (r) =>
                (r.idText && r.idText.toLowerCase().startsWith(q)) ||
                r.title.toLowerCase().includes(q),
            )
            .sort(
              (a, b) =>
                Number(b.idText.toLowerCase().startsWith(q)) -
                Number(a.idText.toLowerCase().startsWith(q)),
            )
            .slice(0, 6)
            .map((r) => ({
              id: r.id,
              label: r.title,
              idText: r.idText,
              cover: r.cover,
              hint: r.dbName,
              type: "row" as const,
            }))
        : [];

      const matchedDates: MentionItem[] = getDateSuggestions(query).map(
        (d) => ({
          id: `date:${d.id}`,
          label: d.label,
          date: d.label,
          type: "date" as const,
          iso: d.iso,
          hint: d.hint,
          remind: d.remind,
          includeTime: d.includeTime,
        }),
      );

      const result: MentionItem[] = [];
      const section = (title: NonNullable<MentionItem["title"]>) =>
        result.push({
          id: `divider-${title}`,
          label: "",
          title,
          type: "divider",
        });

      if (matchedDates.length) {
        section("Date");
        result.push(...matchedDates);
      }

      // People, then "Invite…" (with the address when one was typed).
      section("People");
      result.push(...matchedUsers);
      const typed = query.trim();
      result.push({
        id: "action-invite",
        label: EMAIL.test(typed) ? typed : "",
        type: "action",
        action: "invite",
      });

      if (matchedPages.length) {
        section("Pages");
        result.push(...matchedPages);
      }

      if (matchedRows.length) {
        section("Rows");
        result.push(...matchedRows);
      }

      // A new page titled with what was typed.
      section("NewPage");
      result.push(
        {
          id: "action-subpage",
          label: "",
          type: "action",
          action: "subpage",
          newTitle: typed,
        },
        {
          id: "action-page-in",
          label: "",
          type: "action",
          action: "pageIn",
          newTitle: typed,
        },
      );

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
      if (props.type === "action") {
        const slash = editor.storage.slashCommand ?? {};
        if (props.action === "invite") {
          // The panel replaces the menu; the mention goes where "@" was.
          editor.chain().focus().deleteRange(range).run();
          openInviteMentionPanel(editor, range.from, props.label || "");
          return;
        }
        if (props.action === "subpage" || props.action === "createIn") {
          const parentId =
            props.action === "createIn"
              ? (props.parentId ?? null)
              : (slash.activePageId ?? null);
          const add = slash.addPageAsync as
            | ((o: { title: string; parentId: string | null }) => Promise<{
                id: string;
              }>)
            | undefined;
          if (!add) return;
          editor.chain().focus().deleteRange(range).run();
          const at = editor.state.selection.from;
          void add({ title: props.newTitle ?? "", parentId }).then((page) => {
            if (editor.isDestroyed) return;
            editor
              .chain()
              .insertContentAt(Math.min(at, editor.state.doc.content.size), {
                type: "pageLink",
                attrs: {
                  pageId: page.id,
                  parentId: slash.activePageId ?? null,
                  title: "",
                  nodeId: `pageLink-${Date.now()}`,
                },
              })
              .run();
          });
        }
        return;
      }
      if (props.type === "page") {
        editor.chain().focus().deleteRange(range).run();
        editor.commands.insertContent({
          type: "pageLink",
          attrs: {
            pageId: props.id,
            parentId: editor.storage.slashCommand?.activePageId ?? null,
            title: "",
            nodeId: `pageLink-${Date.now()}`,
          },
        });
      } else if (props.type === "row") {
        // A row: an inline chip that opens it in its database.
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "mention",
              attrs: {
                id: props.id,
                label: props.label,
                rowId: props.id,
                mentionSuggestionChar: "@",
                nodeId: `mention-${Date.now()}`,
              },
            },
            { type: "text", text: " " },
          ])
          .run();
      } else if (props.type === "date") {
        // A date chip: the date itself is stored, so "Today" written on
        // Monday still reads Monday's date on Tuesday ("Yesterday").
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "mention",
              attrs: {
                id: "date",
                label: props.label,
                mentionSuggestionChar: "@",
                nodeId: `mention-${Date.now()}`,
                date: props.iso,
                remind: props.remind ?? null,
                includeTime: !!props.includeTime,
              },
            },
            { type: "text", text: " " },
          ])
          .run();
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

          // The editor may be tearing down (page switch / unmount) when onExit fires.
          // Reading the doc then throws (nodeSize of undefined). Bail if the editor is
          // destroyed or the range is out of the current doc bounds.
          if (editor.isDestroyed) {
            reactRenderer?.element.remove();
            reactRenderer?.destroy();
            return;
          }

          const { state } = editor;
          const docSize = state.doc.content.size;
          if (range.from > docSize || range.to > docSize) {
            reactRenderer?.element.remove();
            reactRenderer?.destroy();
            return;
          }

          const textAtRange = state.doc.textBetween(
            Math.min(range.from, docSize),
            Math.min(range.to, docSize),
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
