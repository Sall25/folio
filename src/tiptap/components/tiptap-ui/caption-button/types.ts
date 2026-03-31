import type { Editor } from "@tiptap/core";

export type UseCaptionProps = {
  editor: Editor | null;
  allowedBlockTypes?: string[];
  hideWhenUnavailable?: boolean;
};

export type UseCaptionReturnProps = {
  isVisible: boolean;
};
