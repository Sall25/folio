import type { JSONContent } from "@tiptap/core";

// A page's title is a `title` node (content: "inline*") at the top of the doc —
// its text is an inline child, NOT an attr. A freshly created page has empty
// content, so there's no title node to render; the TitleNode plugin then
// force-inserts an EMPTY one, which is why a new page shows a blank title.
//
// This builds a doc whose title node is pre-filled from page.title, so the
// title renders populated on first load. It does NOT get written back to the
// DB — page.title stays the source of truth, and the existing title↔page sync
// persists edits into content on first change.

function hasTitleNode(content: JSONContent | null | undefined): boolean {
  return content?.content?.[0]?.type === "title";
}

function isEmptyDoc(content: JSONContent | null | undefined): boolean {
  return !content || !content.content || content.content.length === 0;
}

// Build a fresh doc: a title (empty inline content when the title is blank —
// an empty text node is invalid in ProseMirror), plus a trailing paragraph for
// the cursor to land in.
export function buildInitialContent(title: string): JSONContent {
  const trimmed = title?.trim() ?? "";
  return {
    type: "doc",
    content: [
      {
        type: "title",
        content: trimmed ? [{ type: "text", text: trimmed }] : [],
      },
      { type: "paragraph" },
    ],
  };
}

// Given a page's stored content + its title, return the content that should be
// fed to setContent. If the content already has a title node (real page), it's
// returned untouched. If it's empty / has no title node (brand-new page), a
// seeded doc reflecting page.title is returned instead.
export function contentForEditor(
  content: JSONContent | null | undefined,
  title: string,
): JSONContent {
  if (!isEmptyDoc(content) && hasTitleNode(content)) {
    return content as JSONContent;
  }
  if (isEmptyDoc(content)) {
    return buildInitialContent(title);
  }
  // Non-empty but missing a title node: prepend a filled title so the plugin
  // doesn't insert a blank one, keeping the rest of the existing content.
  const trimmed = title?.trim() ?? "";
  return {
    type: "doc",
    content: [
      {
        type: "title",
        content: trimmed ? [{ type: "text", text: trimmed }] : [],
      },
      ...(content!.content ?? []),
    ],
  };
}
