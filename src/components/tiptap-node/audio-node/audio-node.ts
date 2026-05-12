import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { AudioNodeView } from "./audio-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audio: {
      insertAudio: (attrs?: {
        src?: string;
        fileName?: string;
        caption?: string;
      }) => ReturnType;
    };
  }
}

export const AudioExtension = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      fileName: { default: null },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audio"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "audio" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView);
  },

  addCommands() {
    return {
      insertAudio:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: "audio",
            attrs: {
              src: attrs.src ?? null,
              fileName: attrs.fileName ?? null,
              caption: attrs.caption ?? "",
            },
          }),
    };
  },
});
