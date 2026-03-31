import { Extension } from "@tiptap/core";
import { getSelectedNodesOfType } from "src/lib/tiptap-utils";
import { updateNodesAttr } from "src/lib/tiptap-utils";

type AlignType =
  | "left"
  | "right"
  | "justify"
  | "center"
  | "top"
  | "middle"
  | "bottom";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeAlignment: {
      align: (target: AlignType) => ReturnType;
      isAligned: (target: AlignType) => ReturnType;
    };
  }
}

export interface NodeAlignmentOptions {
  /**
   * Node types that should support alignment
   * @default ["paragraph", "heading", "blockquote", "taskList", "bulletList", "orderedList", "tableCell", "tableHeader"]
   */
  types: string[];
  /**
   * Use inline style instead of data attribute
   * @default true
   */
  useStyle?: boolean;
}

export const NodeAlignment = Extension.create<NodeAlignmentOptions>({
  name: "nodeAlignment",

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
        "tableRow",
        "table",
        "figure",
      ],
      useStyle: true,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          nodeAlign: {
            default: null as string | null,
            parseHTML: (element) => {
              return (
                element.style?.textAlign ||
                element.getAttribute("data-align") ||
                null
              );
            },
            renderHTML: (attributes) => {
              if (!attributes.nodeAlign) return {};
              return this.options.useStyle
                ? { style: `text-align: ${attributes.nodeAlign}` }
                : { "data-align": attributes.nodeAlign };
            },
          },
          nodeVerticalAlign: {
            default: null as string | null,
            parseHTML: (element) => {
              return (
                element.style?.verticalAlign ||
                element.getAttribute("data-vertical-align") ||
                null
              );
            },
            renderHTML: (attributes) => {
              if (!attributes.nodeVerticalAlign) return {};
              return this.options.useStyle
                ? { style: `vertical-align: ${attributes.nodeVerticalAlign}` }
                : { "data-vertical-align": attributes.nodeVerticalAlign };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set text-align to specific value
       */
      align:
        (target: AlignType) =>
        ({ state, tr, dispatch }) => {
          const targets = getSelectedNodesOfType(
            state.selection,
            this.options.types,
          );
          if (targets.length === 0) return false;

          const isVertical = ["top", "middle", "bottom"].includes(target);
          const attr = isVertical ? "nodeVerticalAlign" : "nodeAlign";

          if (dispatch) {
            dispatch(updateNodesAttr(tr, targets, attr, target));
          }
          return true;
        },
      isAligned:
        (target: AlignType) =>
        ({ state }) => {
          const isVertical = ["top", "middle", "bottom"].includes(target);
          const attr = isVertical ? "nodeVerticalAlign" : "nodeAlign";

          const targets = getSelectedNodesOfType(
            state.selection,
            this.options.types,
          );
          if (targets.length === 0) return false;

          return targets.every(({ node }) => node.attrs[attr] === target);
        },
    };
  },
});
