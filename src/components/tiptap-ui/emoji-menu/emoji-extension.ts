/* eslint-disable @typescript-eslint/no-explicit-any */
import Emoji, {
  type EmojiItem,
  type EmojiStorage,
} from "@tiptap/extension-emoji";
import { ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import { EmojiList } from "./emoji-list";
import {
  computePosition,
  flip,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";
import { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";
import emojiMartData from "@emoji-mart/data";
import { EmojiNodeView } from "./emoji-node-view";
import type { Editor } from "@tiptap/core";

const data = emojiMartData as any;

const FORBIDDEN_BLOCKS = [
  "codeBlock",
  "table",
  "tableCell",
  "tableHeader",
  "code",
] as const;

const isInForbiddenBlock = (editor: Editor) =>
  FORBIDDEN_BLOCKS.some((block) => editor.isActive(block));

function toAppleEmojiUrl(native: string) {
  const codepoint = [...native]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((hex) => hex !== "fe0f")
    .join("-");
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${codepoint}.png`;
}

// ---------------------------------------------------------------------------
// Emoji support detection — cached in localStorage so the expensive canvas
// pixel-test only ever runs once per browser, not on every page switch.
// ---------------------------------------------------------------------------
const EMOJI_SUPPORT_CACHE_KEY = "emoji_supported_v1";

function checkEmojiSupportedNow(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    canvas.width = 1;
    canvas.height = 1;
    ctx.fillText("😀", -4, 4);
    return ctx.getImageData(0, 0, 1, 1).data[3] > 0;
  } catch {
    return false;
  }
}

function getCachedEmojiSupport(): boolean | null {
  try {
    const cached = localStorage.getItem(EMOJI_SUPPORT_CACHE_KEY);
    if (cached !== null) return cached === "true";
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
  return null;
}

function setCachedEmojiSupport(value: boolean): void {
  try {
    localStorage.setItem(EMOJI_SUPPORT_CACHE_KEY, String(value));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------

const emojiList = Object.values(data.emojis).map((emoji: any) => ({
  emoji: emoji.skins[0].native,
  name: emoji.name,
  id: emoji.id,
  shortcodes: [emoji.id, ...(emoji.aliases ?? [])],
  tags: emoji.keywords ?? [],
  group: emoji.category ?? "",
  emoticons: [],
  version: emoji.version ?? 0,
  src: toAppleEmojiUrl(emoji.skins[0].native),
}));

// Pre-index shortcodes and tags for O(1) prefix lookup
const shortcodeIndex = new Map<string, typeof emojiList>();
const tagIndex = new Map<string, typeof emojiList>();

for (const emoji of emojiList) {
  for (const sc of emoji.shortcodes) {
    if (!shortcodeIndex.has(sc)) shortcodeIndex.set(sc, []);
    shortcodeIndex.get(sc)!.push(emoji);
  }
  for (const tag of emoji.tags) {
    if (!tagIndex.has(tag)) tagIndex.set(tag, []);
    tagIndex.get(tag)!.push(emoji);
  }
}

function searchEmojis(query: string, limit = 20) {
  if (!query) return emojiList.slice(0, limit);
  const q = query.toLowerCase();
  const seen = new Set<string>();
  const results: typeof emojiList = [];

  for (const [key, emojis] of shortcodeIndex) {
    if (key.startsWith(q)) {
      for (const e of emojis) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          results.push(e);
        }
      }
    }
  }
  for (const [key, emojis] of tagIndex) {
    if (key.startsWith(q)) {
      for (const e of emojis) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          results.push(e);
        }
      }
    }
  }

  return results.slice(0, limit);
}

export const EmojiExtension = Emoji.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute("src"),
        renderHTML: (attrs) => (attrs.src ? { src: attrs.src } : {}),
      },
    };
  },

  addStorage() {
    return {
      ...this.parent?.(),
      emojiNativeSupported: getCachedEmojiSupport() ?? true,
    } as EmojiStorage & { emojiNativeSupported: boolean };
  },

  onCreate() {
    if (getCachedEmojiSupport() !== null) return;

    const run = () => {
      const supported = checkEmojiSupportedNow();
      setCachedEmojiSupport(supported);
      (
        this.storage as EmojiStorage & { emojiNativeSupported: boolean }
      ).emojiNativeSupported = supported;
    };

    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(run, { timeout: 3000 });
    } else {
      setTimeout(run, 500);
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmojiNodeView);
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "img",
      {
        src: HTMLAttributes.src,
        alt: node.attrs.name,
        class: "emoji",
        draggable: "false",
        loading: "lazy",
        align: "absmiddle",
      },
    ];
  },
}).configure({
  emojis: emojiList,

  suggestion: {
    items: ({ query, editor }) => {
      if (isInForbiddenBlock(editor as Editor)) return [];
      return searchEmojis(query);
    },
    allowSpaces: true,
    char: ":",
    decorationClass: "emoji-suggestion",
    decorationContent: "emoji",

    command: ({ editor, range, props }) => {
      const nodeAfter = editor.state.selection.$to.nodeAfter;
      const overrideSpace = nodeAfter?.text?.startsWith(" ");

      const docSize = editor.state.doc.content.size;
      const to = overrideSpace ? Math.min(range.to + 1, docSize) : range.to;

      editor
        .chain()
        .focus()
        .insertContentAt({ from: range.from, to }, [
          {
            type: "emoji",
            attrs: {
              name: props.shortcodes[0],
              src: toAppleEmojiUrl(props.emoji),
            },
          },
          { type: "text", text: " " },
        ])
        .command(({ tr, state }) => {
          tr.setStoredMarks(state.doc.resolve(state.selection.to - 2).marks());
          return true;
        })
        .run();
    },

    render: () => {
      let component: ReactRenderer<any>;

      const updatePosition = (clientRect: any, element: HTMLElement) => {
        const virtualEl: VirtualElement = {
          getBoundingClientRect: () => clientRect,
        };

        computePosition(virtualEl, element, {
          placement: "bottom-start",
          strategy: "absolute",
          middleware: [shift(), flip()],
        }).then((pos) => {
          Object.assign(component.element.style, {
            width: "max-content",
            position: pos.strategy,
            left: `${pos.x}px`,
            top: `${pos.y}px`,
          });
        });
      };

      return {
        onStart: (props: any) => {
          if (isInForbiddenBlock(props.editor)) {
            exitSuggestion(props.editor.view);
            return;
          }

          component = new ReactRenderer(EmojiList, {
            props,
            editor: props.editor,
          });

          component.element.style.position = "absolute";

          document.body.appendChild(component.element);
          requestAnimationFrame(() => {
            updatePosition(props.clientRect(), component.element);
          });
        },

        onUpdate: (props: any) => {
          component.updateProps(props);
          requestAnimationFrame(() => {
            updatePosition(props.clientRect(), component.element);
          });
        },

        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            component.destroy();
            exitSuggestion(props.view);
          } else {
            component.ref?.onKeyDown(props);
          }
          return false;
        },

        onExit: (props: SuggestionProps<EmojiItem>) => {
          const { editor, range } = props;
          const { state } = editor;
          const docSize = state.doc.content.size;

          const from = Math.min(range.from, docSize);
          const to = Math.min(range.to, docSize);

          if (from >= to) {
            if (document.body.contains(component.element)) {
              document.body.removeChild(component.element);
            }
            component.destroy();
            return;
          }

          try {
            const textAtRange = state.doc.textBetween(from, to, "\0", "\0");
            const cursorPos = state.selection.from;
            const stillSlash = textAtRange.startsWith(":");
            const cursorInside =
              cursorPos >= range.from && cursorPos <= range.to + 1;

            if (stillSlash && cursorInside) return;
          } catch {
            console.log("Invalid insertion");
          }

          if (document.body.contains(component.element)) {
            document.body.removeChild(component.element);
          }
          component.destroy();
        },
      };
    },
  },
});
