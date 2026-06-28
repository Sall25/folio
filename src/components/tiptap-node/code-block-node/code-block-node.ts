import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CodeBlockView } from "./code-block-view";
import { createLowlight } from "lowlight";

import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import scss from "highlight.js/lib/languages/scss";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";

// Only the grammars the language picker actually offers, instead of lowlight's
// full `common` set. plaintext needs no grammar; jsx/tsx/html reuse a base grammar.
const lowlight = createLowlight();

lowlight.register({
  javascript,
  jsx: javascript,
  typescript,
  tsx: typescript,
  html: xml,
  xml,
  css,
  scss,
  json,
  markdown,
  python,
  rust,
  go,
  java,
  c,
  cpp,
  bash,
  sql,
  yaml,
});

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
