import { Extension } from "@tiptap/core";
import { getSelectedNodesOfType } from "src/lib/tiptap-utils";
import { updateNodesAttr } from "src/lib/tiptap-utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeCaption: {
      setCaption: (caption: string) => ReturnType;
    };
  }
}

export interface NodeCaptionOptions {
  /**
   * Node types that should support caption content
   */
  types: string[];
}

export const NodeCaption = Extension.create<NodeCaptionOptions>({
  name: "nodeCaption",

  addOptions() {
    return {
      types: ["image", "blockquote", "codeBlock"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          nodeCaption: {
            default: null as string | null,

            parseHTML: (element: HTMLElement) => {
              const dataCaption = element.getAttribute("data-caption");
              return dataCaption || null;
            },

            renderHTML: (attributes) => {
              const nodeCaption = attributes.nodeCaption as string | null;
              if (!nodeCaption) return {};

              return {
                "data-caption": nodeCaption,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set text-captionContent to specific value
       */
      setCaption:
        (caption) =>
        ({ state, tr, dispatch }) => {
          const targets = getSelectedNodesOfType(
            state.selection,
            this.options.types,
          );

          if (targets.length === 0) return false;

          if (dispatch) {
            dispatch(updateNodesAttr(tr, targets, "nodeCaption", caption));
          }

          return true;
        },
    };
  },
});
