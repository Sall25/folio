import { Extension } from "@tiptap/core";
import { clearNodesContent, getSelectedNodesOfType } from "@/lib/tiptap-utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeClearContents: {
      clearAllContents: () => ReturnType;
    };
  }
}

export interface NodeClearContentsOptions {
  /**
   * Node types that should support content clearing
   */
  types: string[];
  /**
   * Use inline style instead of data attribute
   * @default true
   */
  useStyle?: boolean;
}

export const NodeClearContents = Extension.create<NodeClearContentsOptions>({
  name: "nodeClearContents",

  addOptions() {
    return {
      types: ["tableCell", "tableHeader"],
      useStyle: true,
    };
  },

  addCommands() {
    return {
      /**
       * Set text-fitContent to specific value
       */
      clearAllContents: () => {
        return ({ dispatch, state }) => {
          const targets = getSelectedNodesOfType(
            state.selection,
            this.options.types,
          );

          if (targets.length === 0) return false;
          

          return clearNodesContent(state, dispatch, [
            "tableCell",
            "tableHeader",
          ]);
        };
      },
    };
  },
});
