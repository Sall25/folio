import type { NodeWithPos } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { getSelectedNodesOfType, type DispatchFn } from "src/lib/tiptap-utils";
import { updateNodesAttr } from "src/lib/tiptap-utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeColor: {
      setNodeColor: (color: string) => ReturnType;
      unsetNodeColor: () => ReturnType;
      toggleNodeColor: (color: string) => ReturnType;
    };
  }
}

export interface NodeColorOptions {
  /**
   * Node types that should support colors
   * @default ["paragraph", "heading", "blockquote", "taskList", "bulletList", "orderedList", "tableCell", "tableHeader"]
   */
  types: string[];
  /**
   * Use inline style instead of data attribute
   * @default true
   */
  useStyle?: boolean;
}

/**
 * Determines the target color for toggle operations
 */
function getToggleColor(
  targets: NodeWithPos[],
  inputColor: string,
): string | null {
  if (targets.length === 0) return null;

  for (const target of targets) {
    const currentColor = target.node.attrs?.color ?? null;
    if (currentColor !== inputColor) {
      return inputColor;
    }
  }

  return null;
}

export const NodeColor = Extension.create<NodeColorOptions>({
  name: "nodeColor",

  addOptions() {
    return {
      types: [
        "paragraph",
        "heading",
        "blockquote",
        "taskList",
        "bulletList",
        "orderedList",
        "tableCell",
        "tableHeader",
      ],
      useStyle: true,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null as string | null,

            parseHTML: (element: HTMLElement) => {
              const styleColor = element.style?.color;
              if (styleColor) return styleColor;

              const dataColor = element.getAttribute("data-color");
              return dataColor || null;
            },

            renderHTML: (attributes) => {
              const color = attributes.color as string | null;
              if (!color) return {};

              if (this.options.useStyle) {
                return {
                  style: `color: ${color}`,
                };
              } else {
                return {
                  "data-color": color,
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
     * Generic command executor for Color color operations
     */
    const executeColorCommand = (
      getTargetColor: (
        targets: NodeWithPos[],
        inputColor?: string,
      ) => string | null,
    ) => {
      return (inputColor?: string) =>
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

          const targetColor = getTargetColor(targets, inputColor);

          if (dispatch) {
            dispatch(updateNodesAttr(tr, targets, "color", targetColor));
          }

          return true;
        };
    };

    return {
      /**
       * Set Color color to specific value
       */
      setNodeColor: executeColorCommand((_, inputColor) => inputColor || null),

      /**
       * Remove Color color
       */
      unsetNodeColor: executeColorCommand(() => null),

      /**
       * Toggle Color color (set if different/missing, unset if all have it)
       */
      toggleNodeColor: executeColorCommand((targets, inputColor) =>
        getToggleColor(targets, inputColor || ""),
      ),
    };
  },
});
