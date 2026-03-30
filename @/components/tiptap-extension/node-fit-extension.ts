import { Extension } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { getSelectedNodesOfType, type DispatchFn } from "@/lib/tiptap-utils";
import { updateNodesAttr } from "@/lib/tiptap-utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeFit: {
      fitContent: () => ReturnType;
    };
  }
}

export interface NodeFitOptions {
  /**
   * Node types that should support fit content
   * @default ["paragraph", "heading", "blockquote", "taskList", "bulletList", "orderedList", "tableCell", "tableHeader"]
   */
  types: string[];
  /**
   * Use inline style instead of data attribute
   * @default true
   */
  useStyle?: boolean;
}

export const NodeFit = Extension.create<NodeFitOptions>({
  name: "nodeFit",

  addOptions() {
    return {
      types: ["tableCell", "tableHeader"],
      useStyle: true,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          nodeFit: {
            default: null as string | null,

            parseHTML: (element: HTMLElement) => {
              const styleFit = element.style?.wordBreak;
              if (styleFit) return styleFit;

              const dataFit = element.getAttribute("data-fit");
              return dataFit || null;
            },

            renderHTML: (attributes) => {
              const nodeFit = attributes.nodeFit as string | null;
              if (!nodeFit) return {};

              if (this.options.useStyle) {
                return {
                  style: `word-break: ${nodeFit}`,
                };
              } else {
                return {
                  "data-fit": nodeFit,
                };
              }
            },
          },
        },
      },
    ];
  },

  addCommands() {
    /**
     * Generic command executor for text fitContent operations
     */
    const executeFitCommand = () => {
      return () =>
        ({
          state,
          tr,
          dispatch,
        }: {
          state: EditorState;
          tr: Transaction;
          dispatch: DispatchFn;
        }) => {
          const targets = getSelectedNodesOfType(
            state.selection,
            this.options.types,
          );

          if (targets.length === 0) return false;

          if (dispatch) {
            dispatch(updateNodesAttr(tr, targets, "nodeFit", undefined));
          }

          return true;
        };
    };

    return {
      /**
       * Set text-fitContent to specific value
       */
      fitContent: executeFitCommand(),
    };
  },
});
