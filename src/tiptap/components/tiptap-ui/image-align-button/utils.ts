import type { Editor } from "@tiptap/core";
import type { AlignValue } from "./types";
import { NodeSelection } from "@tiptap/pm/state";

// ─── Utilities ────────────────────────────────────────────────────────────────
// export function canSetImageAlign(
//   editor: Editor | null,
// ): boolean {

//   return true
//   // if (!editor) return false;
//   // const { state } = editor;
//   // const { selection } = state;

//   // // Only NodeSelection makes sense for images
//   // if (!(selection instanceof NodeSelection)) return false;

//   // const node = selection.node;
//   // console.log('node', node)
//   // if (node.type.name !== 'image') return false;

//   // console.log('node valid')

//   // const result = node.attrs?.align !== undefined && node.attrs.align !== null;

//   // console.log('result', result)

//   // // Check that the node actually has the attribute in its schema
//   // return result
// }

export function isImageAlignActive(
  editor: Editor | null,
  align: string,
): boolean {
  if (!editor) return false;
  const { state } = editor;
  const { selection } = state;

  if (!(selection instanceof NodeSelection)) return false;

  const node = selection.node;
  if (node.type.name !== "image" && node.type.name !== "figure") return false;

  return node.attrs?.nodeAlign === align;
}

export function setImageAlign(
  editor: Editor | null,
  alignValue: AlignValue,
): boolean {
  if (!editor) return false;
  try {
    // const { state, view } = editor
    // const { selection } = state

    // if (selection instanceof NodeSelection && selection.node.type.name === "image") {
    //   const pos = selection.from

    //   view.dispatch(
    //     state.tr.setNodeMarkup(pos, undefined, {
    //       ...selection.node.attrs,
    //       align: alignValue,
    //     })
    //   )
    //   console.log('dispatched')
    //   console.log(editor.schema.nodes.image.spec.attrs)
    //   editor.commands.updateAttributes("image", {
    //     align: "center"
    //   })
    // }
    // return true
    console.log("aligned");
    return editor.chain().focus().align(alignValue).run();
  } catch {
    return false;
  }
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
