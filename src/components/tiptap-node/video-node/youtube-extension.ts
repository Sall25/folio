import { Youtube } from "@tiptap/extension-youtube";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { YoutubeNodeView } from "./youtube-node-view";

export const YoutubeExtension = Youtube.extend({
  addNodeView() {
    return ReactNodeViewRenderer(YoutubeNodeView);
  },
}).configure({
  controls: true,
  allowFullscreen: true,
  nocookie: true,
  modestBranding: true,
  rel: 0,
});
