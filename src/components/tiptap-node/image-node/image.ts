/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResizableNodeViewDirection } from "@tiptap/core";
import {
  mergeAttributes,
  Node,
  nodeInputRule,
  //  ResizableNodeView,
} from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageView } from "./image-view";
import { NodeSelection } from "@tiptap/pm/state";

export interface ImageOptions {
  /**
   * Controls if the image node should be inline or not.
   * @default false
   * @example true
   */
  inline: boolean;

  /**
   * Controls if base64 images are allowed. Enable this if you want to allow
   * base64 image urls in the `src` attribute.
   * @default false
   * @example true
   */
  allowBase64: boolean;

  /**
   * HTML attributes to add to the image element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>;

  /**
   * Controls if the image should be resizable and how the resize is configured.
   * @default false
   * @example { directions: { top: true, right: true, bottom: true, left: true, topLeft: true, topRight: true, bottomLeft: true, bottomRight: true }, minWidth: 100, minHeight: 100 }
   */
  resize:
    | {
        enabled: boolean;
        directions?: ResizableNodeViewDirection[];
        minWidth?: number;
        minHeight?: number;
        alwaysPreserveAspectRatio?: boolean;
      }
    | false;
}

export interface SetImageOptions {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageNode: {
      /**
       * Add an image
       * @param options The image attributes
       * @example
       * editor
       *   .commands
       *   .setImage({ src: 'https://tiptap.dev/logo.png', alt: 'tiptap', title: 'tiptap logo' })
       */
      setImage: (options: SetImageOptions) => ReturnType;
      toggleImageCaption: () => ReturnType;
      focusImageCaption: () => ReturnType;
      replaceImage: () => ReturnType;
    };
  }
}

/**
 * Matches an image to a ![image](src "title") on input.
 */
export const inputRegex =
  /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

/**
 * This extension allows you to insert images.
 * @see https://www.tiptap.dev/api/nodes/image
 */
export const Image = Node.create<ImageOptions>({
  name: "image",

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      resize: false,
    };
  },

  content: "block*",

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      align: {
        default: "left",
      },
      widthPreset: {
        default: null,
      },
      showCaption: {
        default: false,
      },
      caption: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? "img[src]"
          : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode("image", {
      src: token.href,
      title: token.title,
      alt: token.text,
    });
  },

  renderMarkdown: (node) => {
    const src = node.attrs?.src ?? "";
    const alt = node.attrs?.alt ?? "";
    const title = node.attrs?.title ?? "";

    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
      replaceImage:
        () =>
        ({ state, commands }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection)) return false;
          const node = selection.node;
          if (node.type.name !== "image") return false;

          const pos = selection.from;

          return commands.insertContentAt(
            { from: pos, to: pos + node.nodeSize },
            {
              type: "imageUpload",
              attrs: {
                accept: "image/*",
                limit: 1,
                maxSize: 0,
                _replaceAttrs: node.attrs,
              },
            },
          );
        },
      toggleImageCaption:
        () =>
        ({ commands, state }) => {
          const { selection } = state;
          const node = selection.$anchor.nodeAfter ?? selection.$anchor.parent;
          if (node?.type.name !== this.name) return false;
          const showCaption = node.attrs.showCaption ?? false;
          return commands.updateAttributes(this.name, {
            showCaption: !showCaption,
          });
        },
      focusImageCaption:
        () =>
        ({ state, view, dispatch }) => {
          const { selection } = state;

          // NodeSelection gives us the node directly
          const isNodeSelection = "node" in selection;
          const node = isNodeSelection
            ? (selection as NodeSelection).node
            : null;

          if (!node || node.type.name !== "image") return false;

          const pos = selection.$anchor.pos;

          if (!node.attrs.showCaption) {
            if (dispatch) {
              dispatch(
                state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  showCaption: true,
                }),
              );
            }
          }

          requestAnimationFrame(() => {
            const nodeDOM = view.nodeDOM(pos) as HTMLElement | null;
            const caption = nodeDOM?.querySelector<HTMLElement>(
              "[data-image-caption]",
            );
            caption?.focus();
          });

          return true;
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match;

          return { src, alt, title };
        },
      }),
    ];
  },
});
