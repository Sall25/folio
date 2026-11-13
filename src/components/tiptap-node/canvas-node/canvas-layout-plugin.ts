import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { DEFAULT_BLOCK_WIDTH } from "./canvas-attrs";

// What puts a block where it belongs on the canvas.
//
// The obvious route — renderHTML on the position attributes — only reaches
// nodes the editor renders from renderHTML. Every block with a React node
// view (a database, a figure, a callout) draws its own DOM, and renderHTML is
// only used when the document is serialised, so those blocks would ignore the
// position entirely.
//
// A node decoration reaches all of them: ProseMirror puts its class and style
// on whatever DOM the node ended up with, node views included. So the canvas
// positions its children from the outside, and no block type has to know the
// canvas exists.

export const canvasLayoutKey = new PluginKey("canvasLayout");

function decorateCanvas(canvas: PMNode, pos: number, out: Decoration[]): void {
  canvas.forEach((child, offset) => {
    const from = pos + 1 + offset;
    const x = Number(child.attrs.canvasX ?? 0);
    const y = Number(child.attrs.canvasY ?? 0);
    const w = Number(child.attrs.canvasW ?? DEFAULT_BLOCK_WIDTH);
    const id = String(child.attrs.canvasId ?? "");
    out.push(
      Decoration.node(from, from + child.nodeSize, {
        class: "canvas-child",
        "data-canvas-id": id,
        // ProseMirror merges class and style with whatever the node already
        // carries, so a block keeps its own looks and gains a position.
        style: `transform: translate(${x}px, ${y}px); width: ${w}px;`,
      }),
    );
  });
}

export function canvasDecorations(
  state: EditorState,
  typeName: string,
): DecorationSet {
  const out: Decoration[] = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name !== typeName) return true;
    decorateCanvas(node, pos, out);
    // Its children are placed; a canvas inside a canvas isn't a thing.
    return false;
  });
  return out.length ? DecorationSet.create(state.doc, out) : DecorationSet.empty;
}

export function canvasLayoutPlugin(typeName: string): Plugin {
  return new Plugin({
    key: canvasLayoutKey,
    props: {
      decorations(state) {
        return canvasDecorations(state, typeName);
      },
    },
  });
}
