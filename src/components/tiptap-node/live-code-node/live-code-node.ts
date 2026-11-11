import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { passMousemove } from "src/lib/pass-mousemove";
import { LiveCodeView } from "./live-code-view";

// A live code block (/live): HTML, CSS and JavaScript tabs with their result
// running beside them. The code is kept in the block's attributes, so
// everyone on the page sees it change as it's typed (the page's live sync).
// Readers can't edit it; "Try it myself" gives them their own copy, kept on
// their device (live-code-copy.ts).

export type LiveCodeLayout = "split" | "stacked" | "result";

export interface LiveCodeAttrs {
  /** Stable id: a reader's own copy is kept under it. */
  blockId: string;
  html: string;
  css: string;
  js: string;
  layout: LiveCodeLayout;
}

export const LIVE_CODE_STARTER: Omit<LiveCodeAttrs, "blockId"> = {
  html: '<button class="bouton">S\'inscrire</button>\n',
  css: ".bouton {\n  background: #2f6fdb;\n  color: white;\n  padding: 12px 22px;\n  border: none;\n  border-radius: 10px;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.bouton:hover {\n  background: #1f4f9e;\n}\n",
  js: "",
  layout: "split",
};

const newId = () =>
  crypto.randomUUID?.() ??
  `lc_${Date.now()}_${Math.random().toString(36).slice(2)}`;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    liveCode: {
      insertLiveCode: (attrs?: Partial<LiveCodeAttrs>) => ReturnType;
    };
  }
}

const textAttr = (name: string, fallback: string) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? fallback,
  renderHTML: (attrs: Record<string, unknown>) => ({
    [`data-${name}`]: String(attrs[name] ?? ""),
  }),
});

export const LiveCodeExtension = Node.create({
  name: "liveCode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: textAttr("blockid", ""),
      html: textAttr("html", ""),
      css: textAttr("css", ""),
      js: textAttr("js", ""),
      layout: textAttr("layout", "split"),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="live-code"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "live-code" }),
    ];
  },

  addNodeView() {
    return passMousemove(ReactNodeViewRenderer(LiveCodeView));
  },

  addCommands() {
    return {
      insertLiveCode:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { ...LIVE_CODE_STARTER, blockId: newId(), ...attrs },
          }),
    };
  },
});
