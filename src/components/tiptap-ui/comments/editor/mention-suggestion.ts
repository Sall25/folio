import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { MentionList, type MentionListRef } from "./mention-list";
import type { Person } from "src/types";

// The suggestion config for the Mention extension. `people` is injected at
// configure() time (the composer passes the current workspace people). Filters
// by name/email as the user types after "@", renders the MentionList popup, and
// on select inserts a mention node carrying the person id + label.
export function createMentionSuggestion(
  getPeople: () => Person[],
): Omit<SuggestionOptions, "editor"> {
  return {
    char: "@",

    items: ({ query }) => {
      const q = query.toLowerCase();
      return getPeople()
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q),
        )
        .slice(0, 6)
        .map((p) => ({ id: p.id, label: p.name, email: p.email }));
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });
          if (!props.clientRect) return;
          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate: (props) => {
          component?.updateProps(props);
          if (!props.clientRect) return;
          popup?.[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            popup?.[0].hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit: () => {
          popup?.[0].destroy();
          component?.destroy();
          popup = null;
          component = null;
        },
      };
    },
  };
}
