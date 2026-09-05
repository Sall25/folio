import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface TopLevelClassOptions {
  /** Class added to each qualifying top-level block. */
  className: string;
  /** Node type names to skip (no class added). */
  exclude: string[];
}

const topLevelClassKey = new PluginKey("topLevelClass");

/**
 * Adds a class to every DIRECT child of the document (top-level block) except
 * the excluded node types. Decoration-based: it paints the class, doesn't
 * mutate the doc, and recomputes on every change.
 */
export const TopLevelClassExtension = Extension.create<TopLevelClassOptions>({
  name: "topLevelClass",

  addOptions() {
    return {
      className: "top-level-block",
      exclude: ["database"],
    };
  },

  addProseMirrorPlugins() {
    const { className, exclude } = this.options;
    const skip = new Set(exclude);

    return [
      new Plugin({
        key: topLevelClassKey,
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            // forEach on the doc iterates ONLY its direct children.
            state.doc.forEach((node, offset) => {
              if (!skip.has(node.type.name)) {
                decos.push(
                  Decoration.node(offset, offset + node.nodeSize, {
                    class: className,
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
