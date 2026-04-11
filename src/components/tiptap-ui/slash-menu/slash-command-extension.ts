// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { Extension, posToDOMRect } from "@tiptap/core";
// import Suggestion, {
//   exitSuggestion,
//   type SuggestionProps,
// } from "@tiptap/suggestion";
// import { ReactRenderer } from "@tiptap/react";
// import type { Plugin } from "@tiptap/pm/state";
// import SlashList from "./slash-command-list";
// import {
//   computePosition,
//   flip,
//   offset,
//   shift,
//   type VirtualElement,
// } from "@floating-ui/dom";

// import "./slash-command-extension.scss";
// import {
//   SLASH_COMMANDS,
//   type SlashCommand as SlashItem,
// } from "./slash-commands";

// const COLOR_TRIGGER_KEYWORDS = ["color", "highlight", "colour"];

// const isColorItem = (cmd: SlashItem) => cmd.id.startsWith("color-");
// const isColorStructural = (cmd: SlashItem) =>
//   cmd.id === "colorsDivider" || cmd.id === "colors";

// export const SlashCommand = Extension.create({
//   name: "slash-command",

//   addOptions() {
//     return {
//       commands: SLASH_COMMANDS,
//     };
//   },

//   addProseMirrorPlugins() {
//     const editor = this.editor;
//     let reactRenderer: ReactRenderer<any> | null = null;
//     let selectedIndex = 0;
//     let destroyed = false;
//     //  let currentProps: SuggestionProps<SlashItem> | null = null;
//     let resizeObserver: ResizeObserver | null = null;

//     const updatePosition = (element: HTMLElement) => {
//       const virtualElement: VirtualElement = {
//         getBoundingClientRect: () =>
//           posToDOMRect(
//             editor.view,
//             editor.state.selection.from,
//             editor.state.selection.to,
//           ),
//       };
//       computePosition(virtualElement, element, {
//         placement: "bottom-start",
//         strategy: "absolute",
//         middleware: [offset(2), shift(), flip()],
//       }).then(({ x, y, strategy }) => {
//         element.style.width = "max-content";
//         element.style.position = strategy;
//         element.style.left = `${x}px`;
//         element.style.top = `${y}px`;
//       });
//     };

//     function createRenderer(props: SuggestionProps<SlashItem>) {
//       //  currentProps = props;
//       selectedIndex = 0;
//       if (destroyed) {
//         return;
//       }

//       reactRenderer = new ReactRenderer(SlashList, {
//         editor,
//         props: {
//           ...props,
//           selectedIndex,
//           onClickItem: (item: SlashItem) => {
//             props.command(item);
//             exitSuggestion(editor.view);
//           },
//           onClose: () => {
//             reactRenderer?.destroy();
//             destroyed = true;
//             exitSuggestion(editor.view);
//           },
//         },
//       });

//       reactRenderer.element.style.position = "absolute";

//       document.body.appendChild(reactRenderer.element);

//       updatePosition(reactRenderer.element);

//       // reposition whenever the menu resizes (e.g. after filtering)
//       resizeObserver = new ResizeObserver(() => {
//         if (reactRenderer) updatePosition(reactRenderer.element);
//       });
//       resizeObserver.observe(reactRenderer.element);
//     }

//     function updateRenderer(props: SuggestionProps<SlashItem>) {
//       //currentProps = props;
//       if (!reactRenderer || destroyed) {
//         return;
//       }

//       reactRenderer.updateProps({
//         ...props,
//         selectedIndex,
//         onClickItem: (item: SlashItem) => {
//           props.command(item);
//           exitSuggestion(editor.view);
//         },
//         onClose: () => {
//           reactRenderer?.destroy();
//           destroyed = true;
//           exitSuggestion(editor.view);
//         },
//       });
//     }

//     function destroyRenderer(props: SuggestionProps<SlashItem>) {
//       const { editor, range } = props;
//       const { state } = editor;

//       const docSize = state.doc.content.size;

//       // Bail early if range is completely out of bounds
//       if (range.from >= docSize) {
//         reactRenderer?.destroy();
//         reactRenderer = null;
//         //currentProps = null;
//         return;
//       }

//       const clampedTo = Math.min(range.to, docSize);

//       try {
//         const textAtRange = state.doc.textBetween(
//           range.from,
//           clampedTo,
//           "\0",
//           "\0",
//         );
//         const cursorPos = state.selection.from;
//         const stillSlash = textAtRange.startsWith("/");
//         const cursorInside =
//           cursorPos >= range.from && cursorPos <= range.to + 1;

//         if (stillSlash && cursorInside) return;
//       } catch {
//         // Range is stale, just destroy
//         console.log("range is stale");
//       }

//       if (reactRenderer) {
//         try {
//           reactRenderer.destroy();
//           resizeObserver?.disconnect();
//           resizeObserver = null;
//         } catch {
//           console.log("Failed to destroy reactRenderer");
//         }
//         try {
//           if (reactRenderer.element?.parentNode)
//             reactRenderer.element.parentNode.removeChild(reactRenderer.element);
//         } catch {
//           console.log("Failed to remove element");
//         }
//         reactRenderer = null;
//       }
//       //currentProps = null;
//     }

//     const suggestion = Suggestion<SlashItem>({
//       editor,
//       char: "/",
//       startOfLine: false,
//       decorationClass: "slash-suggestion",
//       allowSpaces: true,
//       decorationContent: "Filter...",
//       allowedPrefixes: null,

//       items: ({ query, editor }) => {
//         if (
//           destroyed ||
//           editor.isActive("codeBlock") ||
//           editor.isActive("table") ||
//           editor.isActive("tableCell") ||
//           editor.isActive("tableHeader") ||
//           editor.isActive("code")
//         ) {
//           return [];
//         }

//         const q = (query || "").toLowerCase();

//         const showColorSection =
//           q.length > 0 &&
//           (this.options.commands as SlashItem[])
//             .filter(isColorItem)
//             .some(
//               (cmd) =>
//                 cmd.title.toLowerCase().includes(q) ||
//                 COLOR_TRIGGER_KEYWORDS.some(
//                   (kw) => kw.includes(q) || q.includes(kw),
//                 ),
//             );

//         return (this.options.commands as SlashItem[]).filter((cmd) => {
//           // Structural color markers only show when a color item will be visible
//           if (isColorStructural(cmd)) return showColorSection;

//           // Color items use the same title filter as everything else
//           if (isColorItem(cmd)) {
//             return (
//               q.length > 0 &&
//               (cmd.title.toLowerCase().includes(q) ||
//                 COLOR_TRIGGER_KEYWORDS.some(
//                   (kw) => kw.includes(q) || q.includes(kw),
//                 ))
//             );
//           }

//           // Everything else
//           return cmd.title.toLowerCase().includes(q);
//         });
//       },

//       command: ({ editor: ed, range, props }) => {
//         ed.chain().focus().deleteRange(range).run();
//         props.run(ed);
//       },
//       render: () => ({
//         onStart: (props) => {
//           if (destroyed) {
//             destroyed = !destroyed;
//             return;
//           }
//           createRenderer(props);
//           requestAnimationFrame(() => {
//             const el = editor.view.dom.querySelector(".slash-suggestion");
//             el?.classList.add("is-empty");
//           });
//         },
//         onUpdate: (props) => {
//           if (props.items.length === 0) return;
//           if (destroyed || !reactRenderer) return;

//           updateRenderer(props);

//           requestAnimationFrame(() => {
//             const el = editor.view.dom.querySelector(".slash-suggestion");
//             if (props.query.length > 0) {
//               el?.classList.remove("is-empty");
//             } else {
//               el?.classList.add("is-empty");
//             }
//           });
//         },
//         onKeyDown({ view, event }) {
//           if (event.key === "Escape") {
//             reactRenderer?.destroy();
//             exitSuggestion(view);
//           }
//           if (event.key === "Space") {
//             console.log("space");
//           }
//           return false;
//         },
//         onExit: destroyRenderer,
//       }),
//     });

//     return [suggestion as unknown as Plugin];
//   },
// });

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor, Extension, posToDOMRect } from "@tiptap/core";
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

const FORBIDDEN_BLOCKS = [
  "codeBlock",
  "table",
  "tableCell",
  "tableHeader",
  "code",
] as const;

const isInForbiddenBlock = (editor: Editor) =>
  FORBIDDEN_BLOCKS.some((block) => editor.isActive(block));

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
    let destroyed = false;
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
      selectedIndex = 0;
      if (destroyed) {
        return;
      }

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
            reactRenderer?.destroy();
            destroyed = true;
            exitSuggestion(editor.view);
          },
        },
      });

      reactRenderer.element.style.position = "absolute";

      document.body.appendChild(reactRenderer.element);

      updatePosition(reactRenderer.element);

      resizeObserver = new ResizeObserver(() => {
        if (reactRenderer) updatePosition(reactRenderer.element);
      });
      resizeObserver.observe(reactRenderer.element);
    }

    function updateRenderer(props: SuggestionProps<SlashItem>) {
      if (!reactRenderer || destroyed) {
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
          reactRenderer?.destroy();
          destroyed = true;
          exitSuggestion(editor.view);
        },
      });
    }

    function destroyRenderer(props: SuggestionProps<SlashItem>) {
      const { editor, range } = props;
      const { state } = editor;

      const docSize = state.doc.content.size;

      if (range.from >= docSize) {
        reactRenderer?.destroy();
        reactRenderer = null;
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
    }

    const suggestion = Suggestion<SlashItem>({
      editor,
      char: "/",
      startOfLine: false,
      decorationClass: "slash-suggestion",
      allowSpaces: true,
      decorationContent: "Filter...",
      allowedPrefixes: null,

      items: ({ query, editor }) => {
        if (destroyed || isInForbiddenBlock(editor)) {
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
          if (isColorStructural(cmd)) return showColorSection;

          if (isColorItem(cmd)) {
            return (
              q.length > 0 &&
              (cmd.title.toLowerCase().includes(q) ||
                COLOR_TRIGGER_KEYWORDS.some(
                  (kw) => kw.includes(q) || q.includes(kw),
                ))
            );
          }

          return cmd.title.toLowerCase().includes(q);
        });
      },

      command: ({ editor: ed, range, props }) => {
        ed.chain().focus().deleteRange(range).run();
        props.run(ed);
      },
      render: () => ({
        onStart: (props) => {
          // Don't show the decoration or renderer inside forbidden blocks
          if (isInForbiddenBlock(props.editor)) {
            exitSuggestion(editor.view);
            return;
          }

          if (destroyed) {
            destroyed = !destroyed;
            return;
          }
          createRenderer(props);
          requestAnimationFrame(() => {
            const el = editor.view.dom.querySelector(".slash-suggestion");
            el?.classList.add("is-empty");
          });
        },
        onUpdate: (props) => {
          if (props.items.length === 0) return;
          if (destroyed || !reactRenderer) return;

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
        onKeyDown({ view, event }) {
          if (event.key === "Escape") {
            reactRenderer?.destroy();
            exitSuggestion(view);
          }
          if (event.key === "Space") {
            console.log("space");
          }
          return false;
        },
        onExit: destroyRenderer,
      }),
    });

    return [suggestion as unknown as Plugin];
  },
});
