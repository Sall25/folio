import type { Editor } from "@tiptap/core";

export type UseReplaceFigureProps = {
  editor: Editor | null;
  allowedBlockTypes?: string[];
  hideWhenUnavailable?: boolean;
};

export type UseReplaceFigureReturnProps = {
  isVisible: boolean;
};
