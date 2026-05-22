import type { Editor } from "@tiptap/core";
import type { AlignValue } from "./types";
import { NodeSelection } from "@tiptap/pm/state";

export function isImageAlignActive(
  editor: Editor | null,
  align: string,
): boolean {
  if (!editor) return false;
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return false;
  const node = selection.node;
  if (node.type.name !== "image") return false;
  return node.attrs?.align === align; // ← was nodeAlign
}

export function setImageAlign(
  editor: Editor | null,
  alignValue: AlignValue,
): boolean {
  if (!editor) return false;
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return false;
  const node = selection.node;
  if (node.type.name !== "image") return false;

  return editor
    .chain()
    .focus()
    .updateAttributes("image", { align: alignValue })
    .run();
}
export function shouldShowButton(props: {
  editor: Editor | null;
  align: AlignValue;
  hideWhenUnavailable?: boolean;
  extensionName?: string;
  attributeName?: string;
}): boolean {
  const { hideWhenUnavailable } = props;
  if (!hideWhenUnavailable) return true;
  return true;
}
