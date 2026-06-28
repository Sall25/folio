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
import { EmojiNodeView } from "./emoji-node-view";
import type { Editor } from "@tiptap/core";

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
// Emoji dataset — deferred. @emoji-mart/data is ~567KB and was previously
// imported at module scope, landing in the editor-create (boot) bundle even
// though emoji are only ever SEARCHED behind an explicit ":" keystroke.
// Existing emoji nodes render fine without it (EmojiNodeView reads attrs.src),
// so the dataset is loaded lazily on first picker open, then cached for the
// rest of the session. ensureEmojiData() is idempotent and de-dupes concurrent
// calls via the shared promise.
// ---------------------------------------------------------------------------
type EmojiEntry = {
  emoji: string;
  name: string;
  id: string;
  shortcodes: string[];
  tags: string[];
  group: string;
  emoticons: never[];
  version: number;
  src: string;
};

let emojiList: EmojiEntry[] = [];
let shortcodeIndex = new Map<string, EmojiEntry[]>();
let tagIndex = new Map<string, EmojiEntry[]>();
let emojiDataLoaded = false;
let emojiDataPromise: Promise<void> | null = null;

function ensureEmojiData(): Promise<void> {
  if (emojiDataLoaded) return Promise.resolve();
  if (!emojiDataPromise) {
    emojiDataPromise = import("@emoji-mart/data").then((mod) => {
      const data = ((mod as any).default ?? mod) as any;

      emojiList = Object.values(data.emojis).map((emoji: any) => ({
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

      // Pre-index shortcodes and tags for O(1) prefix lookup — built once,
      // when the dataset first loads.
      const sIdx = new Map<string, EmojiEntry[]>();
      const tIdx = new Map<string, EmojiEntry[]>();
      for (const e of emojiList) {
        for (const sc of e.shortcodes) {
          if (!sIdx.has(sc)) sIdx.set(sc, []);
          sIdx.get(sc)!.push(e);
        }
        for (const tag of e.tags) {
          if (!tIdx.has(tag)) tIdx.set(tag, []);
          tIdx.get(tag)!.push(e);
        }
      }
      shortcodeIndex = sIdx;
      tagIndex = tIdx;
      emojiDataLoaded = true;
    });
  }
  return emojiDataPromise;
}

// ---------------------------------------------------------------------------
// Search — runs against the lazily-built indexes. Returns [] if called before
// the dataset has loaded (shouldn't happen: callers await ensureEmojiData
// first, but this keeps it safe).
// ---------------------------------------------------------------------------
function searchEmojis(query: string, limit = 20) {
  if (!emojiDataLoaded) return [];
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
          if (results.length >= limit) return results;
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
          if (results.length >= limit) return results;
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// The extension
// ---------------------------------------------------------------------------
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
    // Read from cache synchronously — no canvas work at all on first render
    // if we've seen this browser before. Defaults to true (optimistic) so
    // native emoji render immediately; the idle check corrects it if wrong.
    return {
      ...this.parent?.(),
      emojiNativeSupported: getCachedEmojiSupport() ?? true,
    } as EmojiStorage & { emojiNativeSupported: boolean };
  },

  onCreate() {
    // Prefetch the emoji dataset in idle time — off the critical boot path,
    // so it never blocks startup or first paint, but is usually ready by the
    // time the user types ":". The dynamic import keeps the 567KB chunk out
    // of the editor-create bundle either way.
    const idlePrefetch = () => void ensureEmojiData();
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(idlePrefetch, { timeout: 4000 });
    } else {
      setTimeout(idlePrefetch, 1200);
    }

    // If we already have a cached result, skip the canvas check entirely.
    if (getCachedEmojiSupport() !== null) return;

    // Schedule the canvas check in idle time so it never blocks the initial
    // render or navigation. The 3s timeout is a fallback so it still runs
    // even on a busy tab.
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
  // Empty at config time — the real list is loaded lazily and used by the
  // suggestion below. Keeping this empty is what gets the dataset out of boot.
  emojis: [],

  suggestion: {
    items: async ({ query, editor }) => {
      if (isInForbiddenBlock(editor as Editor)) return [];
      await ensureEmojiData();
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

      const updatePosition = (
        clientRect: () => DOMRect,
        element: HTMLElement,
      ) => {
        const virtualEl: VirtualElement = {
          getBoundingClientRect: clientRect,
        };

        computePosition(virtualEl, element, {
          placement: "bottom-start",
          strategy: "absolute",
          middleware: [shift(), flip()],
        }).then((pos) => {
          Object.assign(element.style, {
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

          // Position after paint so the element has dimensions
          requestAnimationFrame(() => {
            updatePosition(props.clientRect, component.element);
          });
        },

        onUpdate: (props: any) => {
          component.updateProps(props);
          requestAnimationFrame(() => {
            updatePosition(props.clientRect, component.element);
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
