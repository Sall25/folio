import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  DEFAULT_BLOCK_WIDTH,
  parseEdges,
  pruneEdges,
  type CanvasEdge,
} from "./canvas-attrs";

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

/**
 * The links of a block that has just left the canvas, by canvas.
 *
 * This is the one safe moment to cut them. A block can be missing from a
 * render while a collaborator's change is being applied, so pruning on what
 * is on screen would throw links away that nobody asked to lose. A document
 * change is different: the block is actually gone, and because the cut rides
 * along in the same transaction, one undo brings the block and its links
 * back together.
 */
function prunedCanvases(
  state: EditorState,
  typeName: string,
): { pos: number; edges: CanvasEdge[] }[] {
  const out: { pos: number; edges: CanvasEdge[] }[] = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name !== typeName) return true;
    const edges = parseEdges(node.attrs.edges);
    if (edges.length) {
      const present = new Set<string>();
      node.forEach((child) => {
        const id = child.attrs.canvasId;
        if (id) present.add(String(id));
      });
      const kept = pruneEdges(edges, present);
      if (kept.length !== edges.length) out.push({ pos, edges: kept });
    }
    return false;
  });
  return out;
}

export function canvasLayoutPlugin(typeName: string): Plugin {
  return new Plugin({
    key: canvasLayoutKey,

    props: {
      decorations(state) {
        return canvasDecorations(state, typeName);
      },
    },

    appendTransaction(trs, _oldState, newState) {
      if (!trs.some((tr) => tr.docChanged)) return null;
      const changes = prunedCanvases(newState, typeName);
      if (changes.length === 0) return null;
      const tr = newState.tr;
      for (const change of changes) {
        tr.setNodeAttribute(change.pos, "edges", change.edges);
      }
      return tr;
    },
  });
}
