import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PomodoroView } from "./pomodoro-view";
import { POMODORO_DEFAULTS, type PomodoroAttrs } from "./pomodoro-timing";
import { passMousemove } from "src/lib/pass-mousemove";

// A Pomodoro timer block (/pomodoro): focus and break rounds, in one of five
// looks (ring, clock, line, flip, sheet), set per block. See
// pomodoro-timing.ts for how the running clock is stored.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pomodoro: {
      insertPomodoro: (attrs?: Partial<PomodoroAttrs>) => ReturnType;
    };
  }
}

export const PomodoroExtension = Node.create({
  name: "pomodoro",
  group: "block",
  content: "block*",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return Object.fromEntries(
      (Object.keys(POMODORO_DEFAULTS) as (keyof PomodoroAttrs)[]).map((k) => [
        k,
        {
          default: POMODORO_DEFAULTS[k],
          parseHTML: (el: HTMLElement) => {
            const raw = el.getAttribute(`data-${k.toLowerCase()}`);
            if (raw == null) return POMODORO_DEFAULTS[k];
            try {
              return JSON.parse(raw);
            } catch {
              return raw;
            }
          },
          renderHTML: (attrs: Record<string, unknown>) => ({
            [`data-${k.toLowerCase()}`]: JSON.stringify(attrs[k]),
          }),
        },
      ]),
    );
  },

  parseHTML() {
    return [{ tag: 'div[data-type="pomodoro"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "pomodoro" }),
    ];
  },

  addNodeView() {
    return passMousemove(ReactNodeViewRenderer(PomodoroView));
  },

  addCommands() {
    return {
      insertPomodoro:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { ...POMODORO_DEFAULTS, ...attrs },
          }),
    };
  },
});
