import type { Editor } from "@tiptap/core";
import {
  Fragment,
  type Node as PMNode,
  type NodeType,
  type Schema,
} from "@tiptap/pm/model";
import { getSelectedBlocks, selectBlocks } from "src/lib/block-selection";
import type { BlockTypeOption } from "./types";

// "Turn into" for a block selection (several whole blocks, see
// lib/block-selection). Only the selected blocks are rebuilt, where they
// are: blocks selected inside a callout or a column stay in it.
//
//   Text, Heading     every text block becomes one (lists, quotes and
//                     callouts among them are taken apart first)
//   Bullet / numbered / to-do list
//                     the text blocks become the items of one list
//   Quote, Callout    the blocks go into one quote / callout (lists kept)
//   Code block        the text, line by line, goes into one code block
//
// Blocks that have no text to convert (an image, a table, a database…)
// stay as they are, between the converted ones. Choosing what every block
// already is turns them back into text, like the button on one block does.
// The blocks stay selected afterwards, so another action can follow.

const LISTS: Record<string, string> = {
  bulletList: "listItem",
  orderedList: "listItem",
  taskList: "taskItem",
};
const WRAPPERS = ["blockquote", "callout"];
/** Text blocks whose text can move to another kind of text block. */
const TEXT_BLOCKS = ["paragraph", "heading", "codeBlock"];

type Target =
  | { kind: "text"; type: "paragraph" }
  | { kind: "text"; type: "heading"; level: number }
  | { kind: "list"; type: string }
  | { kind: "wrap"; type: string }
  | { kind: "code" };

function targetOf(option: BlockTypeOption): Target | null {
  const { type } = option;
  if (type === "paragraph") return { kind: "text", type };
  if (type === "heading") {
    return { kind: "text", type, level: option.level ?? 1 };
  }
  if (type in LISTS) return { kind: "list", type };
  if (WRAPPERS.includes(type)) return { kind: "wrap", type };
  if (type === "codeBlock") return { kind: "code" };
  return null;
}

function isConvertible(node: PMNode): boolean {
  const name = node.type.name;
  return TEXT_BLOCKS.includes(name) || name in LISTS || WRAPPERS.includes(name);
}

/** Whether a block already is what the option makes. */
function isAlready(node: PMNode, target: Target): boolean {
  const name = node.type.name;
  switch (target.kind) {
    case "text":
      return target.type === "heading"
        ? name === "heading" && node.attrs.level === target.level
        : name === "paragraph";
    case "code":
      return name === "codeBlock";
    default:
      return name === target.type;
  }
}

/** The blocks inside lists, quotes and callouts, in reading order (lists
 *  are kept whole when `keepLists`). Anything else is returned as is. */
function flatten(node: PMNode, keepLists: boolean, out: PMNode[] = []) {
  const name = node.type.name;
  const open =
    WRAPPERS.includes(name) ||
    name === "listItem" ||
    name === "taskItem" ||
    (!keepLists && name in LISTS);
  if (node.isTextblock || !open) out.push(node);
  else node.forEach((child) => flatten(child, keepLists, out));
  return out;
}

/** The attributes of `node` that `type` also has (id, colours,
 *  alignment…), plus `extra`. */
function carriedAttrs(
  node: PMNode,
  type: NodeType,
  extra: Record<string, unknown> = {},
  keepId = true,
) {
  const attrs: Record<string, unknown> = {};
  for (const key of Object.keys(type.spec.attrs ?? {})) {
    if (key in node.attrs && (keepId || key !== "id")) {
      attrs[key] = node.attrs[key];
    }
  }
  return { ...attrs, ...extra };
}

/** A text block as one or more blocks of `type` (a code block gives one
 *  per line). Formatting is kept where the new type allows it. */
function asTextBlocks(
  node: PMNode,
  type: NodeType,
  extra: Record<string, unknown> = {},
): PMNode[] {
  const { schema } = type;
  if (node.type.name === "codeBlock") {
    return node.textContent
      .split("\n")
      .map((line, i) =>
        type.create(
          carriedAttrs(node, type, extra, i === 0),
          line ? schema.text(line) : null,
        ),
      );
  }
  const attrs = carriedAttrs(node, type, extra);
  try {
    const made = type.create(attrs, node.content);
    made.check();
    return [made];
  } catch {
    // Inline content the new type can't hold: keep the words.
    const text = node.textContent;
    return [type.create(attrs, text ? schema.text(text) : null)];
  }
}

/** Runs of consecutive nodes that pass `inRun`, each turned into one node
 *  by `make`; the other nodes are kept between them. */
function groupRuns(
  nodes: PMNode[],
  inRun: (node: PMNode) => boolean,
  make: (run: PMNode[]) => PMNode[],
): PMNode[] {
  const out: PMNode[] = [];
  let run: PMNode[] = [];
  const flush = () => {
    if (run.length) out.push(...make(run));
    run = [];
  };
  for (const node of nodes) {
    if (inRun(node)) run.push(node);
    else {
      flush();
      out.push(node);
    }
  }
  flush();
  return out;
}

const isTextBlock = (node: PMNode) => TEXT_BLOCKS.includes(node.type.name);

function convert(
  schema: Schema,
  blocks: PMNode[],
  target: Target,
): PMNode[] | null {
  const paragraph = schema.nodes.paragraph;

  // Everything already is the target: back to text.
  const toText = target.kind === "text" && target.type === "paragraph";
  const convertible = blocks.filter(isConvertible);
  if (
    !toText &&
    convertible.length > 0 &&
    convertible.every((node) => isAlready(node, target))
  ) {
    return convert(schema, blocks, { kind: "text", type: "paragraph" });
  }

  switch (target.kind) {
    case "text": {
      const type = schema.nodes[target.type];
      if (!type) return null;
      const extra = target.type === "heading" ? { level: target.level } : {};
      return blocks
        .flatMap((block) => flatten(block, false))
        .flatMap((node) =>
          isTextBlock(node) ? asTextBlocks(node, type, extra) : [node],
        );
    }

    case "list": {
      const listType = schema.nodes[target.type];
      const itemType = schema.nodes[LISTS[target.type]];
      if (!listType || !itemType || !paragraph) return null;
      return groupRuns(
        blocks.flatMap((block) => flatten(block, false)),
        isTextBlock,
        (run) => [
          listType.create(
            null,
            run
              .flatMap((node) => asTextBlocks(node, paragraph))
              .map((p) => itemType.create(null, p)),
          ),
        ],
      );
    }

    case "wrap": {
      const wrapper = schema.nodes[target.type];
      if (!wrapper) return null;
      const fits = (node: PMNode) => wrapper.validContent(Fragment.from(node));
      return groupRuns(
        blocks.flatMap((block) => flatten(block, true)),
        fits,
        (run) => [wrapper.create(null, run)],
      );
    }

    case "code": {
      const code = schema.nodes.codeBlock;
      if (!code) return null;
      return groupRuns(
        blocks.flatMap((block) => flatten(block, false)),
        isTextBlock,
        (run) => {
          const text = run.map((node) => node.textContent).join("\n");
          return [code.create(null, text ? code.schema.text(text) : null)];
        },
      );
    }
  }
}

/** Whether "Turn into" can do something for this block selection. */
export function canTurnBlocksInto(editor: Editor): boolean {
  const blocks = getSelectedBlocks(editor.state.selection);
  return !!blocks?.some(({ node }) => isConvertible(node));
}

/** Turns every selected block into `option`. Returns false when the
 *  selection isn't a block selection or nothing could change. */
export function turnBlocksInto(
  editor: Editor,
  option: BlockTypeOption,
): boolean {
  const { state } = editor;
  const blocks = getSelectedBlocks(state.selection);
  const target = targetOf(option);
  if (!blocks?.length || !target) return false;

  const nodes = convert(
    state.schema,
    blocks.map((b) => b.node),
    target,
  );
  if (!nodes) return false;

  const { from, to } = state.selection;
  const content = Fragment.fromArray(nodes);
  try {
    const tr = state.tr.replaceWith(from, to, content);
    selectBlocks(tr, from, tr.mapping.map(to, 1));
    editor.view.dispatch(tr.scrollIntoView());
  } catch {
    // The new blocks aren't allowed here (the parent's rules): no change.
    return false;
  }
  editor.view.focus();
  return true;
}
