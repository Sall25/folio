/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResizableNodeViewDirection } from "@tiptap/core";
import {
  mergeAttributes,
  Node,
  nodeInputRule,
  ResizableNodeView,
} from "@tiptap/core";

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
    image: {
      /**
       * Add an image
       * @param options The image attributes
       * @example
       * editor
       *   .commands
       *   .setImage({ src: 'https://tiptap.dev/logo.png', alt: 'tiptap', title: 'tiptap logo' })
       */
      setImage: (options: SetImageOptions) => ReturnType;
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

  content: 'block*',

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
    if (
      !this.options.resize ||
      !this.options.resize.enabled ||
      typeof document === "undefined"
    ) {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } =
      this.options.resize;

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement("img");
      el.classList.add("tiptap-image-img");
      el.src = HTMLAttributes.src;

      const caption = document.createElement("div");
      caption.classList.add("tiptap-image-caption");

      const nodeView = new ResizableNodeView({
        element: el,
        contentElement: caption,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) {
            return;
          }

          this.editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, {
              width,
              height,
            })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) {
            return false;
          }
          const align = updatedNode.attrs.nodeAlign;
          if (align) {
            nodeView.dom.setAttribute("data-align", align);
            el.setAttribute("data-align", align);
          } else {
            nodeView.dom.removeAttribute("data-align");
            el.removeAttribute("data-align");
          }

          return true;
        },
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          className: {
            container: "tiptap-image-container",
            wrapper: "tiptap-image-content",
            handle: "tiptap-image-handle",
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      const dom = nodeView.dom as HTMLElement;

      const wrapper = dom.querySelector(".tiptap-image-content");
      const handles = dom.querySelectorAll(".tiptap-image-handle");
      const showHandles = () => {
        for (const handle of handles) {
          handle.classList.toggle("visible");
        }
      };
      const hideHandles = () => {
        for (const handle of handles) {
          handle.classList.toggle("visible");
        }
      };
      wrapper?.addEventListener("mouseenter", showHandles);
      wrapper?.addEventListener("mouseleave", hideHandles);

      // when image is loaded, show the node view to get the correct dimensions
      dom.style.visibility = "hidden";
      dom.style.pointerEvents = "none";
      el.onload = () => {
        dom.style.visibility = "";
        dom.style.pointerEvents = "";
      };

      const prevDestroy = nodeView.destroy.bind(nodeView);
      nodeView.destroy = () => {
        wrapper?.removeEventListener("mouseenter", showHandles);
        wrapper?.removeEventListener("mouseleave", hideHandles);

        prevDestroy();
      };

      return nodeView;
    };
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
