import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CodeBlockView } from "./code-block-view";
import { createLowlight, common } from "lowlight";

const lowlight = createLowlight(common);

export const CodeBlockNode = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      filename: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-filename"),
        renderHTML: (attrs) =>
          attrs.filename ? { "data-filename": attrs.filename } : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  defaultLanguage: "plaintext",
  enableTabIndentation: true,
  tabSize: 2,
});
