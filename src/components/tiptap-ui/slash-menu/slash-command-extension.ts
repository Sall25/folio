/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension, posToDOMRect } from "@tiptap/core";
import Suggestion, {
  exitSuggestion,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import type { Plugin } from "@tiptap/pm/state";
import SlashList from "./slash-command-list";
import {
  computePosition,
  flip,
  offset,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";

import "./slash-command-extension.scss";
import {
  SLASH_COMMANDS,
  type SlashCommand as SlashItem,
} from "./slash-commands";

const COLOR_TRIGGER_KEYWORDS = ["color", "highlight", "colour"];

const isColorItem = (cmd: SlashItem) => cmd.id.startsWith("color-");
const isColorStructural = (cmd: SlashItem) =>
  cmd.id === "colorsDivider" || cmd.id === "colors";

export const SlashCommand = Extension.create({
  name: "slash-command",

  addOptions() {
    return {
      commands: SLASH_COMMANDS,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    let reactRenderer: ReactRenderer<any> | null = null;
    let selectedIndex = 0;
    let dismissed = false;
    let dismissedAt: number | null = null;
    //  let currentProps: SuggestionProps<SlashItem> | null = null;
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
      //  currentProps = props;
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
          onClose: () => {
            forceDestroyRenderer();
            exitSuggestion(editor.view);
          },
          dismissed,
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
      //currentProps = props;
      if (!reactRenderer || dismissed) {
        return;
      }

      console.log("update renderer, dismissed", dismissed);

      if (dismissed) {
        console.log("return");
        return;
      }

      reactRenderer.updateProps({
        ...props,
        selectedIndex,
        onClickItem: (item: SlashItem) => {
          props.command(item);
          exitSuggestion(editor.view);
        },
        onClose: () => {
          forceDestroyRenderer();
          exitSuggestion(editor.view);
        },
        dismissed,
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
        //currentProps = null;
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
      //currentProps = null;
    }
    function forceDestroyRenderer() {
      if (reactRenderer) {
        try {
          reactRenderer.destroy();
        } catch {
          /* ignore */
        }
        try {
          if (reactRenderer.element?.parentNode)
            reactRenderer.element.parentNode.removeChild(reactRenderer.element);
        } catch {
          /* ignore */
        }
        reactRenderer = null;
      }
      resizeObserver?.disconnect();
      resizeObserver = null;
      dismissed = true;
      dismissedAt = editor.state.selection.from;
      console.log("dismissed", dismissed);
    }

    const suggestion = Suggestion<SlashItem>({
      editor,
      char: "/",
      startOfLine: false,
      decorationClass: "slash-suggestion",
      allowSpaces: true,
      decorationContent: "Filter...",

      items: ({ query }) => {
        if (dismissed) {
          dismissed = false; // reset so next fresh "/" works
          return [];
        }

        const q = (query || "").toLowerCase();

        const showColorSection =
          q.length > 0 &&
          (this.options.commands as SlashItem[])
            .filter(isColorItem)
            .some(
              (cmd) =>
                cmd.title.toLowerCase().includes(q) ||
                COLOR_TRIGGER_KEYWORDS.some(
                  (kw) => kw.includes(q) || q.includes(kw),
                ),
            );

        return (this.options.commands as SlashItem[]).filter((cmd) => {
          // Structural color markers only show when a color item will be visible
          if (isColorStructural(cmd)) return showColorSection;

          // Color items use the same title filter as everything else
          if (isColorItem(cmd)) {
            return (
              q.length > 0 &&
              (cmd.title.toLowerCase().includes(q) ||
                COLOR_TRIGGER_KEYWORDS.some(
                  (kw) => kw.includes(q) || q.includes(kw),
                ))
            );
          }

          // Everything else
          return cmd.title.toLowerCase().includes(q);
        });
      },

      command: ({ editor: ed, range, props }) => {
        ed.chain().focus().deleteRange(range).run();
        props.run(ed);
      },
      render: () => ({
        onStart: (props) => {
          const { from } = editor.state.selection;
          // const charBefore = editor.state.doc.textBetween(
          //   Math.max(0, from - 2),
          //   from - 1,
          //   "\0",
          //   "\0",
          // );
          // const precededBySpace = charBefore === " ";
          // if (precededBySpace) {
          //   return;
          // }
          console.log("onStart");
          if (dismissed) {
            console.log("onStart should dismiss");
            return;
          }
          const currentPos = editor.state.selection.from;
          if (dismissed && dismissedAt !== null && currentPos !== dismissedAt)
            return;
          dismissed = false;
          createRenderer(props);
          requestAnimationFrame(() => {
            const el = editor.view.dom.querySelector(".slash-suggestion");
            el?.classList.add("is-empty");
          });
        },
        onUpdate: (props) => {
          if (props.items.length === 0) return;
          if (dismissed || !reactRenderer) return;

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
        onKeyDown({ event }) {
          if (event.key === "Escape") {
            reactRenderer?.destroy();
            return true;
          }
          return false;
        },
        onExit: destroyRenderer,
      }),
    });

    return [suggestion as unknown as Plugin];
  },
});
