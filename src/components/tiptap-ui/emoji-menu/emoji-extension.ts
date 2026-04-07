/* eslint-disable @typescript-eslint/no-explicit-any */
import Emoji, { type EmojiItem } from "@tiptap/extension-emoji";
import { ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import { EmojiList } from "./emoji-list";
import {
  computePosition,
  flip,
  offset,
  type VirtualElement,
} from "@floating-ui/dom";
import type { SuggestionProps } from "@tiptap/suggestion";
import emojiMartData from "@emoji-mart/data";
import { EmojiNodeView } from "./emoji-node-view";

const data = emojiMartData as any;

function toAppleEmojiUrl(native: string) {
  const codepoint = [...native]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((hex) => hex !== "fe0f") // strip variation selector
    .join("-");
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${codepoint}.png`;
}

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
    items: ({ query }) => searchEmojis(query),
    allowSpaces: true,
    char: ":",

    command: ({ editor, range, props }) => {
      const nodeAfter = editor.state.selection.$to.nodeAfter;
      const overrideSpace = nodeAfter?.text?.startsWith(" ");
      if (overrideSpace) range.to += 1;

      editor
        .chain()
        .focus()
        .insertContentAt(range, [
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
          middleware: [offset(2), flip()],
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
          component = new ReactRenderer(EmojiList, {
            props,
            editor: props.editor,
          });
          document.body.appendChild(component.element);
          updatePosition(props.clientRect(), component.element);
        },

        onUpdate: (props: any) => {
          component.updateProps(props);
          updatePosition(props.clientRect(), component.element);
        },

        onKeyDown: (props: any) => component.ref?.onKeyDown(props) ?? false,

        onExit: (props: SuggestionProps<EmojiItem>) => {
          const { editor, range } = props;
          const { state } = editor;

          const textAtRange = state.doc.textBetween(
            range.from,
            range.to,
            "\0",
            "\0",
          );
          const cursorPos = state.selection.from;
          const stillSlash = textAtRange.startsWith(":");
          const cursorInside =
            cursorPos >= range.from && cursorPos <= range.to + 1;

          if (stillSlash && cursorInside) return;

          if (document.body.contains(component.element)) {
            document.body.removeChild(component.element);
          }
          component.destroy();
        },
      };
    },
  },
});
