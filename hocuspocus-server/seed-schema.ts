// seed-schema.ts
//
// A MINIMAL, server-safe Tiptap extension set used ONLY to build a schema for
// TiptapTransformer.toYdoc during seeding. It intentionally does NOT import any
// of the real app extensions (those pull in React node views, SCSS, and src/*
// path aliases that can't run in a plain Node process).
//
// The ONLY job here is structural fidelity: every node/mark type that can
// appear in a page's stored content must be declared with the right name,
// group, content model, and attribute keys, so toYdoc round-trips content
// without dropping or reshaping anything. Behavior, rendering, and commands
// are irrelevant at seed time.
//
// Coverage is derived empirically from the actual content in json-server:
//   nodes: blockquote, bookmark, bulletList, callout, codeBlock, column,
//          columnBlock, database, doc, emoji, hardBreak, heading,
//          horizontalRule, image, listItem, mention, pageLink, paragraph,
//          table, tableCell, tableHeader, tableRow, tableWrapper, taskItem,
//          taskList, text, title, tocNode
//   marks: bold, code, highlight, italic, link, strike, textStyle
//
// If a NEW node/mark type is introduced in the app later, it MUST be added
// here too, or seeding will silently drop it. (Consider re-running the
// node-type inventory query periodically.)

import { Node, Mark } from "@tiptap/core";

// Passthrough attrs helper: declares a set of attribute keys with null
// defaults, so any stored attrs survive the round-trip. We don't validate
// them — we just don't want them dropped.
function attrs(keys: string[]) {
  const out: Record<string, { default: null }> = {};
  for (const k of keys) out[k] = { default: null };
  return out;
}

// ── Top-level doc ─────────────────────────────────────────────────────────
const Doc = Node.create({ name: "doc", topNode: true, content: "block+" });

// ── Text + inline ─────────────────────────────────────────────────────────
const Text = Node.create({ name: "text", group: "inline" });

const HardBreak = Node.create({
  name: "hardBreak",
  group: "inline",
  inline: true,
  selectable: false,
});

const Emoji = Node.create({
  name: "emoji",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => attrs(["name", "emoji", "id", "src"]),
});

const Mention = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => attrs(["id", "label", "type"]),
});

// ── Basic blocks ──────────────────────────────────────────────────────────
const Paragraph = Node.create({
  name: "paragraph",
  group: "block",
  content: "inline*",
  addAttributes: () =>
    attrs(["id", "textAlign", "background", "color", "class"]),
});

const Title = Node.create({
  name: "title",
  group: "block",
  content: "inline*",
  defining: true,
  isolating: true,
  addAttributes: () => attrs(["id", "data-toc-id"]),
});

const Heading = Node.create({
  name: "heading",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes: () =>
    attrs(["id", "level", "textAlign", "background", "color", "data-toc-id"]),
});

const Blockquote = Node.create({
  name: "blockquote",
  group: "block",
  content: "block+",
  addAttributes: () => attrs(["id"]),
});

const CodeBlock = Node.create({
  name: "codeBlock",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  addAttributes: () => attrs(["id", "language"]),
});

const HorizontalRule = Node.create({
  name: "horizontalRule",
  group: "block",
});

const Image = Node.create({
  name: "image",
  group: "block",
  addAttributes: () =>
    attrs(["src", "alt", "title", "width", "height", "align", "id"]),
});

const Bookmark = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,
  addAttributes: () =>
    attrs(["url", "title", "description", "image", "favicon", "id"]),
});

const PageLink = Node.create({
  name: "pageLink",
  group: "block",
  atom: true,
  addAttributes: () => attrs(["pageId", "href", "id", "title"]),
});

const TocNode = Node.create({
  name: "tocNode",
  group: "block",
  atom: true,
  addAttributes: () => attrs(["id", "topOffset", "maxShowCount", "showTitle"]),
});

// ── Callout ───────────────────────────────────────────────────────────────
const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  addAttributes: () => attrs(["id", "icon", "color", "background"]),
});

// ── Lists ─────────────────────────────────────────────────────────────────
const BulletList = Node.create({
  name: "bulletList",
  group: "block",
  content: "listItem+",
  addAttributes: () => attrs(["id"]),
});

const OrderedListItem = Node.create({
  name: "listItem",
  content: "paragraph block*",
  addAttributes: () => attrs(["id"]),
});

const TaskList = Node.create({
  name: "taskList",
  group: "block",
  content: "taskItem+",
  addAttributes: () => attrs(["id"]),
});

const TaskItem = Node.create({
  name: "taskItem",
  content: "paragraph block*",
  addAttributes: () => attrs(["id", "checked"]),
});

// ── Columns ───────────────────────────────────────────────────────────────
const ColumnBlock = Node.create({
  name: "columnBlock",
  group: "block",
  content: "column+",
  addAttributes: () => attrs(["id"]),
});

const Column = Node.create({
  name: "column",
  content: "block+",
  addAttributes: () => attrs(["id", "width"]),
});

// ── Page comment ───────────────────────────────────────────────────────────────
const PageComment = Node.create({
  name: "pageComment",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      pageId: { default: null },
    };
  },
});

// ── Tables ────────────────────────────────────────────────────────────────
// tableWrapper wraps table per the app's table-node structure.
const TableWrapper = Node.create({
  name: "tableWrapper",
  group: "block",
  content: "table",
  addAttributes: () => attrs(["id"]),
});

const Table = Node.create({
  name: "table",
  content: "tableRow+",
  isolating: true,
  addAttributes: () => attrs(["id"]),
});

const TableRow = Node.create({
  name: "tableRow",
  content: "(tableCell | tableHeader)*",
});

const TableCell = Node.create({
  name: "tableCell",
  content: "block+",
  isolating: true,
  addAttributes: () => attrs(["colspan", "rowspan", "colwidth", "background"]),
});

const TableHeader = Node.create({
  name: "tableHeader",
  content: "block+",
  isolating: true,
  addAttributes: () => attrs(["colspan", "rowspan", "colwidth", "background"]),
});

// ── Database (inline database node) ───────────────────────────────────────
// Atom + full attr passthrough. The real node carries a lot of config; at
// seed time we only need to preserve it verbatim, not interpret it.
const Database = Node.create({
  name: "database",
  group: "block",
  atom: true,
  addAttributes: () =>
    attrs([
      "id",
      "title",
      "properties",
      "views",
      "activeViewId",
      "icon",
      "cover",
      "templateId",
      "hideTitle",
      "sourceId",
      "pageId",
      "locked",
      "isLinked",
    ]),
});

// ── Marks ─────────────────────────────────────────────────────────────────
const Bold = Mark.create({ name: "bold" });
const Italic = Mark.create({ name: "italic" });
const Strike = Mark.create({ name: "strike" });
const Code = Mark.create({ name: "code" });
const Highlight = Mark.create({
  name: "highlight",
  addAttributes: () => attrs(["color"]),
});
const Link = Mark.create({
  name: "link",
  addAttributes: () => attrs(["href", "target", "rel", "class"]),
});
const TextStyle = Mark.create({
  name: "textStyle",
  addAttributes: () => attrs(["color", "fontFamily", "fontSize"]),
});

// Bundle everything as a single extension list for toYdoc.
export const seedExtensions = [
  Doc,
  Text,
  HardBreak,
  Emoji,
  Mention,
  Paragraph,
  Title,
  Heading,
  Blockquote,
  CodeBlock,
  HorizontalRule,
  Image,
  Bookmark,
  PageLink,
  TocNode,
  Callout,
  BulletList,
  OrderedListItem,
  TaskList,
  TaskItem,
  ColumnBlock,
  Column,
  TableWrapper,
  Table,
  TableRow,
  TableCell,
  TableHeader,
  Database,
  Bold,
  Italic,
  Strike,
  Code,
  Highlight,
  Link,
  TextStyle,
  PageComment,
];
