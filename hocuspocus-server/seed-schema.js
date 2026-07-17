"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedExtensions = void 0;
var core_1 = require("@tiptap/core");
// Passthrough attrs helper: declares a set of attribute keys with null
// defaults, so any stored attrs survive the round-trip. We don't validate
// them — we just don't want them dropped.
function attrs(keys) {
    var out = {};
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var k = keys_1[_i];
        out[k] = { default: null };
    }
    return out;
}
// ── Top-level doc ─────────────────────────────────────────────────────────
var Doc = core_1.Node.create({ name: "doc", topNode: true, content: "block+" });
// ── Text + inline ─────────────────────────────────────────────────────────
var Text = core_1.Node.create({ name: "text", group: "inline" });
var HardBreak = core_1.Node.create({
    name: "hardBreak",
    group: "inline",
    inline: true,
    selectable: false,
});
var Emoji = core_1.Node.create({
    name: "emoji",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes: function () { return attrs(["name", "emoji", "id", "src"]); },
});
var Mention = core_1.Node.create({
    name: "mention",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes: function () { return attrs(["id", "label", "type"]); },
});
// ── Basic blocks ──────────────────────────────────────────────────────────
var Paragraph = core_1.Node.create({
    name: "paragraph",
    group: "block",
    content: "inline*",
    addAttributes: function () {
        return attrs(["id", "textAlign", "background", "color", "class"]);
    },
});
var Title = core_1.Node.create({
    name: "title",
    group: "block",
    content: "inline*",
    defining: true,
    isolating: true,
    addAttributes: function () { return attrs(["id", "data-toc-id"]); },
});
var Heading = core_1.Node.create({
    name: "heading",
    group: "block",
    content: "inline*",
    defining: true,
    addAttributes: function () {
        return attrs(["id", "level", "textAlign", "background", "color", "data-toc-id"]);
    },
});
var Blockquote = core_1.Node.create({
    name: "blockquote",
    group: "block",
    content: "block+",
    addAttributes: function () { return attrs(["id"]); },
});
var CodeBlock = core_1.Node.create({
    name: "codeBlock",
    group: "block",
    content: "text*",
    marks: "",
    code: true,
    defining: true,
    addAttributes: function () { return attrs(["id", "language"]); },
});
var HorizontalRule = core_1.Node.create({
    name: "horizontalRule",
    group: "block",
});
var Image = core_1.Node.create({
    name: "image",
    group: "block",
    addAttributes: function () {
        return attrs(["src", "alt", "title", "width", "height", "align", "id"]);
    },
});
var Bookmark = core_1.Node.create({
    name: "bookmark",
    group: "block",
    atom: true,
    addAttributes: function () {
        return attrs(["url", "title", "description", "image", "favicon", "id"]);
    },
});
var PageLink = core_1.Node.create({
    name: "pageLink",
    group: "block",
    atom: true,
    addAttributes: function () { return attrs(["pageId", "href", "id", "title"]); },
});
var TocNode = core_1.Node.create({
    name: "tocNode",
    group: "block",
    atom: true,
    addAttributes: function () { return attrs(["id", "topOffset", "maxShowCount", "showTitle"]); },
});
// ── Callout ───────────────────────────────────────────────────────────────
var Callout = core_1.Node.create({
    name: "callout",
    group: "block",
    content: "block+",
    addAttributes: function () { return attrs(["id", "icon", "color", "background"]); },
});
// ── Lists ─────────────────────────────────────────────────────────────────
var BulletList = core_1.Node.create({
    name: "bulletList",
    group: "block",
    content: "listItem+",
    addAttributes: function () { return attrs(["id"]); },
});
var OrderedListItem = core_1.Node.create({
    name: "listItem",
    content: "paragraph block*",
    addAttributes: function () { return attrs(["id"]); },
});
var TaskList = core_1.Node.create({
    name: "taskList",
    group: "block",
    content: "taskItem+",
    addAttributes: function () { return attrs(["id"]); },
});
var TaskItem = core_1.Node.create({
    name: "taskItem",
    content: "paragraph block*",
    addAttributes: function () { return attrs(["id", "checked"]); },
});
// ── Columns ───────────────────────────────────────────────────────────────
var ColumnBlock = core_1.Node.create({
    name: "columnBlock",
    group: "block",
    content: "column+",
    addAttributes: function () { return attrs(["id"]); },
});
var Column = core_1.Node.create({
    name: "column",
    content: "block+",
    addAttributes: function () { return attrs(["id", "width"]); },
});
// ── Tables ────────────────────────────────────────────────────────────────
// tableWrapper wraps table per the app's table-node structure.
var TableWrapper = core_1.Node.create({
    name: "tableWrapper",
    group: "block",
    content: "table",
    addAttributes: function () { return attrs(["id"]); },
});
var Table = core_1.Node.create({
    name: "table",
    content: "tableRow+",
    isolating: true,
    addAttributes: function () { return attrs(["id"]); },
});
var TableRow = core_1.Node.create({
    name: "tableRow",
    content: "(tableCell | tableHeader)*",
});
var TableCell = core_1.Node.create({
    name: "tableCell",
    content: "block+",
    isolating: true,
    addAttributes: function () { return attrs(["colspan", "rowspan", "colwidth", "background"]); },
});
var TableHeader = core_1.Node.create({
    name: "tableHeader",
    content: "block+",
    isolating: true,
    addAttributes: function () { return attrs(["colspan", "rowspan", "colwidth", "background"]); },
});
// ── Database (inline database node) ───────────────────────────────────────
// Atom + full attr passthrough. The real node carries a lot of config; at
// seed time we only need to preserve it verbatim, not interpret it.
var Database = core_1.Node.create({
    name: "database",
    group: "block",
    atom: true,
    addAttributes: function () {
        return attrs([
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
        ]);
    },
});
// ── Marks ─────────────────────────────────────────────────────────────────
var Bold = core_1.Mark.create({ name: "bold" });
var Italic = core_1.Mark.create({ name: "italic" });
var Strike = core_1.Mark.create({ name: "strike" });
var Code = core_1.Mark.create({ name: "code" });
var Highlight = core_1.Mark.create({
    name: "highlight",
    addAttributes: function () { return attrs(["color"]); },
});
var Link = core_1.Mark.create({
    name: "link",
    addAttributes: function () { return attrs(["href", "target", "rel", "class"]); },
});
var TextStyle = core_1.Mark.create({
    name: "textStyle",
    addAttributes: function () { return attrs(["color", "fontFamily", "fontSize"]); },
});
// Bundle everything as a single extension list for toYdoc.
exports.seedExtensions = [
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
];
