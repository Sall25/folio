// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { Mention } from "@tiptap/extension-mention";
// import type { MentionItem, MentionListRef } from "./types";
// import {
//   Editor,
//   posToDOMRect,
//   ReactNodeViewRenderer,
//   ReactRenderer,
// } from "@tiptap/react";
// import MentionList from "./mention-list";
// import {
//   type SuggestionKeyDownProps,
//   type SuggestionProps,
// } from "@tiptap/suggestion";
// import { type MentionSuggestion } from "./types";
// import {
//   computePosition,
//   flip,
//   shift,
//   type VirtualElement,
// } from "@floating-ui/dom";
// import { users } from "./users";

// import "./mention-extension.scss";
// import { MentionView } from "./mention-view";

// const MentionWithView = Mention.extend({
//   addNodeView() {
//     return ReactNodeViewRenderer(MentionView);
//   },
// });

// export const MentionExtension = MentionWithView.configure({
//   HTMLAttributes: {
//     class: "mention",
//   },

//   suggestion: {
//     char: "@",
//     startOfLine: false,
//     decorationClass: "mention-suggestion",
//     allowSpaces: true,
//     decorationContent: "Mention dates or people...",

//     items: async ({ query }: { query: string }): Promise<MentionItem[]> => {
//       return users.filter((user) =>
//         user.label.toLowerCase().includes(query.toLowerCase()),
//       );
//     },

//     command: ({
//       editor,
//       range,
//       props,
//     }: {
//       editor: any;
//       range: any;
//       props: any;
//     }) => {
//       editor
//         .chain()
//         .focus()
//         .insertContentAt(range, [
//           {
//             type: "mention",
//             attrs: {
//               id: props.id,
//               label: props.label,
//               mentionSuggestionChar: "@",
//             },
//           },
//           { type: "text", text: " " },
//         ])
//         .run();
//     },

//     render: () => {
//       let reactRenderer: ReactRenderer<MentionListRef> | null = null;

//       const updatePosition = (editor: Editor, element: HTMLElement) => {
//         const virtualEl: VirtualElement = {
//           getBoundingClientRect: () =>
//             posToDOMRect(
//               editor.view,
//               editor.state.selection.from,
//               editor.state.selection.to,
//             ),
//         };
//         computePosition(virtualEl, element, {
//           placement: "bottom-start",
//           strategy: "absolute",
//           middleware: [shift(), flip()],
//         }).then(({ x, y, strategy }) => {
//           element.style.width = "max-content";
//           element.style.position = strategy;
//           element.style.left = `${x}px`;
//           element.style.top = `${y}px`;
//         });
//       };

//       return {
//         onStart: (props: any) => {
//           reactRenderer = new ReactRenderer(MentionList, {
//             props,
//             editor: props.editor,
//           });

//           reactRenderer.element.style.position = "absolute";

//           document.body.appendChild(reactRenderer.element);

//           updatePosition(props.editor, reactRenderer.element);

//           requestAnimationFrame(() => {
//             const el = props.editor.view.dom.querySelector(
//               ".mention-suggestion",
//             );
//             el?.classList.add("is-empty");
//           });
//         },

//         onUpdate(props: any) {
//           reactRenderer?.updateProps(props);
//           requestAnimationFrame(() => {
//             const el = props.editor.view.dom.querySelector(
//               ".mention-suggestion",
//             );
//             if (props.query.length > 0) {
//               el?.classList.remove("is-empty");
//             } else {
//               el?.classList.add("is-empty");
//             }
//           });
//         },

//         onKeyDown(props: SuggestionKeyDownProps) {
//           if (props.event.key === "Escape") {
//             reactRenderer?.destroy();
//             return true;
//           }

//           return reactRenderer?.ref?.onKeyDown(props) ?? false;
//         },

//         onExit(props: SuggestionProps<MentionItem>) {
//           const { editor, range } = props;
//           const { state } = editor;

//           const textAtRange = state.doc.textBetween(
//             range.from,
//             range.to,
//             "\0",
//             "\0",
//           );
//           const cursorPos = state.selection.from;

//           const stillSlash = textAtRange.startsWith("@");
//           const cursorInside =
//             cursorPos >= range.from && cursorPos <= range.to + 1;

//           if (stillSlash && cursorInside) {
//             // Ignore transient exit caused by our own transaction
//             return;
//           }

//           reactRenderer?.element.remove();
//           reactRenderer?.destroy();
//         },
//       };
//     },
//   } satisfies MentionSuggestion,
// });

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

      return users.filter((user) =>
        user.label.toLowerCase().includes(query.toLowerCase()),
      );
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
            },
          },
          { type: "text", text: " " },
        ])
        .run();
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
