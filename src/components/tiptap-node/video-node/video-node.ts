import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { VideoNodeView } from "./video-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      insertVideo: (attrs?: {
        src?: string;
        fileName?: string;
        caption?: string;
        poster?: string;
      }) => ReturnType;
    };
  }
}

export const VideoExtension = Node.create({
  name: "video",
  group: "block",
//  atom: true,
  draggable: true,
  content: "block*",

  addAttributes() {
    return {
      src: { default: null },
      fileName: { default: null },
      caption: { default: "" },
      poster: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },

  addCommands() {
    return {
      insertVideo:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: "video",
            attrs: {
              src: attrs.src ?? null,
              fileName: attrs.fileName ?? null,
              caption: attrs.caption ?? "",
              poster: attrs.poster ?? null,
            },
          }),
    };
  },
});
