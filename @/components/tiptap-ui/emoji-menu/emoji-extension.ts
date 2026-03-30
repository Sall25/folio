/* eslint-disable @typescript-eslint/no-explicit-any */
import Emoji, { type EmojiItem } from "@tiptap/extension-emoji";
import { ReactRenderer } from "@tiptap/react";
import { EmojiList } from "./emoji-list";
import {
  computePosition,
  flip,
  offset,
  type VirtualElement,
} from "@floating-ui/dom";
import type { SuggestionProps } from "@tiptap/suggestion";
import emojiMartData from "@emoji-mart/data";

const data = emojiMartData as any;

export const EmojiExtension = Emoji.configure({
  HTMLAttributes: {
    class: "emoji",
  },
  emojis: Object.values(data.emojis).map((emoji: any) => ({
    emoji: emoji.skins[0].native,
    name: emoji.name,
    id: emoji.id, // add this
    shortcodes: [emoji.id, ...(emoji.aliases ?? [])],
    tags: emoji.keywords ?? [],
    group: emoji.category ?? "",
    emoticons: [],
    version: emoji.version ?? 0,
  })),

  suggestion: {
    items: async ({ editor, query }) => {
      return editor.storage.emoji.emojis.filter(({ shortcodes, tags }) => {
        return (
          shortcodes.find((shortcode) =>
            shortcode.startsWith(query.toLowerCase()),
          ) || tags.find((tag) => tag.startsWith(query.toLowerCase()))
        );
      });
      // .slice(0, 5);
    },
    allowSpaces: true,
    char: ":",

    // command: ({ editor, range, props }) => {
    //   const nodeAfter = editor.state.selection.$to.nodeAfter;

    //   const overrideSpace = nodeAfter?.text?.startsWith(" ");
    //   if (overrideSpace) {
    //     range.to += 1;
    //   }

    //   editor
    //     .chain()
    //     .focus()
    //     .insertContentAt(range, [
    //       {
    //         type: "emoji",
    //         attrs: {
    //           id: props.id,
    //           name: props.name,
    //           emoji: props.emoji,
    //         },
    //       },
    //       {
    //         type: "text",
    //         text: " ",
    //       },
    //     ])
    //     .command(({ tr, state }) => {
    //       tr.setStoredMarks(state.doc.resolve(state.selection.to - 2).marks());
    //       return true;
    //     })
    //     .run();
    // },

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
            attrs: { name: props.shortcodes[0] }, // use shortcode as name
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
          getBoundingClientRect: () => clientRect, //posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to)
        };

        computePosition(virtualEl, element, {
          placement: "bottom-start",
          // strategy: 'absolute',
          middleware: [offset(2), flip()],
        }).then((pos) => {
          Object.assign(component.element.style, {
            width: "max-content",
            position: pos.strategy,
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            // position: pos.strategy === 'fixed' ? 'fixed' : 'absolute',
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

          if (stillSlash && cursorInside) {
            // Ignore transient exit caused by our own transaction
            return;
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
