// extensions/figure.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { FigureNodeViewOptions } from "./types";
import FigureView from "./figure-view";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { MAX_FILE_SIZE } from "@/lib/tiptap-utils";

declare module "@tiptap/core" {
  interface Options {
    figure: FigureNodeViewOptions;
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figure: {
      /** Move cursor into the caption of the currently selected figure */
      focusFigureCaption: () => ReturnType;
      /** Set the caption text of the currently selected figure */
      setFigureCaption: (caption: string) => ReturnType;
      /** Clear the caption of the currently selected figure */
      clearFigureCaption: () => ReturnType;
      /** Replaces the current figure with another */
      replaceFigure: () => ReturnType;
    };
  }
}

export const FigureCaption = Node.create({
  name: "figcaption",
  content: "inline*",
  // no group — only valid inside figure

  parseHTML() {
    return [{ tag: "figcaption" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figcaption", mergeAttributes(HTMLAttributes), 0];
  },
});

export const Figure = Node.create<FigureNodeViewOptions>({
  name: "figure",
  group: "block",
  //content: "inline*", // editable caption lives here
  content: "figcaption?",
  draggable: true,

  addOptions() {
    return {
      directions: ["left", "right"],
      min: { width: 50, height: 50 },
      max: { width: 300, height: 300 },
      preserveAspectRatio: true,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      width: { default: 300 }, // persisted resize value
      showCaption: {
        default: false,
        parseHTML: (el) => el.hasAttribute("data-show-caption"),
        renderHTML: (attrs) =>
          attrs.showCaption ? { "data-show-caption": "" } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { width, ...rest } = HTMLAttributes;
    return [
      "figure",
      mergeAttributes(rest, { style: width ? `width: ${width}` : "" }),
      ["figcaption", 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },

  addCommands() {
    return {
      focusFigureCaption:
        () =>
        ({ state, dispatch, view }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection)) return false;

          const node = selection.node;
          if (node.type !== this.type) return false;

          const figurePos = selection.from;

          // if (dispatch) {
          //   const figcaptionType = state.schema.nodes.figcaption;

          //   console.log("figcaptionType", figcaptionType);

          //   // Create an empty figcaption if content is empty
          //   const figcaption =
          //     node.childCount === 0 ? figcaptionType.create() : null;

          //   let tr = state.tr;

          //   // Insert figcaption first if missing
          //   if (figcaption) {
          //     tr = tr.insert(figurePos + 1, figcaption);
          //     console.log("inserted figcaption", figcaption);
          //   }
          //   tr = state.tr.setNodeMarkup(figurePos, undefined, {
          //     ...node.attrs,
          //     showCaption: true,
          //   });

          //   // +1 inside figure, +1 inside figcaption
          //   tr = tr.setSelection(TextSelection.create(tr.doc, figurePos + 2));

          //   dispatch(tr);
          //   view.focus();
          //   console.log(node.content);
          // }

          if (dispatch) {
            const figcaptionType = state.schema.nodes.figcaption;
            let tr = state.tr;

            if (node.childCount === 0) {
              // Step 1: insert figcaption
              tr = tr.insert(figurePos + 1, figcaptionType.create());
              console.log("inserted");

              // Step 2: setNodeMarkup against the UPDATED doc
              tr = tr.setNodeMarkup(figurePos, undefined, {
                ...tr.doc.nodeAt(figurePos)!.attrs, // 👈 read attrs from tr.doc, not node
                showCaption: true,
              });
            } else {
              tr = tr.setNodeMarkup(figurePos, undefined, {
                ...node.attrs,
                showCaption: true,
              });
            }

            // Step 3: resolve position against final tr.doc
            tr = tr.setSelection(TextSelection.create(tr.doc, figurePos + 2));

            dispatch(tr);
            view.focus();
          }
          return true;
        },

      setFigureCaption:
        (caption: string) =>
        ({ state, dispatch }) => {
          const { selection, doc } = state;

          let figurePos: number | null = null;
          let figureNode = null;

          doc.nodesBetween(selection.from, selection.to, (n, pos) => {
            if (n.type.name === "figure") {
              figurePos = pos;
              figureNode = n;
              return false;
            }
          });

          // Also check if cursor is directly on the figure (NodeSelection)
          if (figurePos === null) {
            const maybePos = selection.from;
            const maybeNode = doc.nodeAt(maybePos);
            if (maybeNode?.type.name === "figure") {
              figurePos = maybePos;
              figureNode = maybeNode;
            }
          }

          if (figurePos === null || !figureNode) return false;

          if (dispatch) {
            const captionStart = figurePos + 1;
            const captionEnd = captionStart + figureNode.content.size;

            // Replace caption content with new text
            const textNode = caption ? state.schema.text(caption) : null;

            const tr = state.tr.replaceWith(
              captionStart,
              captionEnd,
              textNode ? [textNode] : [],
            );
            dispatch(tr);
          }

          return true;
        },

      clearFigureCaption:
        () =>
        ({ commands }) => {
          return commands.setFigureCaption("");
        },

      replaceFigure:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection)) return false;
          if (selection.node.type.name !== "figure") return false;

          const from = selection.from;
          const to = selection.to;
          const oldAttrs = selection.node.attrs;

          if (dispatch) {
            const uploadNode = state.schema.nodes.imageUpload.create({
              // carry over upload options from the extension
              accept: "image/*",
              maxSize: MAX_FILE_SIZE,
              limit: 1,
              // stash old attrs so handleUpload can inherit them
              _replaceAttrs: oldAttrs,
            });

            dispatch(state.tr.replaceWith(from, to, uploadNode));
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.focusFigureCaption(),
    };
  },
});
