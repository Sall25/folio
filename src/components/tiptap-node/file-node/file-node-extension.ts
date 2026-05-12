import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FileNodeView } from "./file-node-view.js";

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface FileNodeOptions {
  accept: string;
  maxSize: number;
  limit: number;
  upload: (
    file: File,
    onProgress: (event: { progress: number }) => void,
    signal: AbortSignal,
  ) => Promise<string>;
  onError?: (error: Error) => void;
  onSuccess?: (url: string) => void;
}

export const FileNode = Node.create<FileNodeOptions>({
  name: "file",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      accept: "*/*",
      maxSize: 10 * 1024 * 1024, // 10MB
      limit: 10,
      upload: async () => "",
    };
  },

  addAttributes() {
    return {
      files: { default: [] }, // FileAttachment[]
      accept: { default: "*/*" },
      maxSize: { default: 10 * 1024 * 1024 },
      limit: { default: 10 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="file"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "file" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileNodeView);
  },
});
