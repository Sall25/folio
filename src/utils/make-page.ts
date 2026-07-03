import type { Page, PageCategory, ID } from "src/types";
import { newId } from "src/lib/id";
import type { JSONContent } from "@tiptap/core";
import { makeDefaultView } from "src/utils/make-default-view";

// Base seeder — a valid empty page. Every field gets a correct "empty".
export function makePage(opts: {
  title?: string;
  parentId?: ID | null;
  category?: PageCategory;
}): Page {
  const title = opts.title ?? "";
  return {
    id: newId(),
    title,
    parentId: opts.parentId ?? null,
    category: opts.category ?? "Private",
    settings: { width: "medium", text: "normal", locked: false },
    cover: {
      iconName: null,
      coverImage: null,
      target: null,
      color: null,
      gradient: null,
      positionY: null,
    },
    // Seed the title node WITH the title text (empty inline content when blank —
    // an empty text node is invalid in ProseMirror), so a new page renders its
    // name instead of the grey placeholder. Matches databasePageContent below.
    content: {
      type: "doc",
      content: [
        { type: "title", content: [] }, // empty title — shows "New Page" placeholder
        { type: "paragraph", content: [] }, // empty body paragraph
      ],
    },
    createdAt: Date.now(),
    updatedAt: null,
    sourceId: null, // not a database row
    values: null, // ditto
  };
}

// A child of an existing page — inherits the parent's category so it lands in
// the same sidebar section, with parentId pointing at the parent.
export function makeChildPage(parent: Page, title = "New Page"): Page {
  return makePage({
    title,
    parentId: parent.id,
    category: parent.category, // inherit the section
  });
}

// clone a template page into a new page
export function makePageFromTemplate(
  template: Page,
  opts?: { parentId?: ID | null; category?: PageCategory },
): Page {
  return {
    ...makePage({
      title: template.title,
      parentId: opts?.parentId ?? null,
      category: opts?.category ?? "Private", // instance lands in a real section, not "Template"
    }),
    content: structuredClone(template.content),
    cover: { ...template.cover },
    settings: { ...template.settings },
  };
}

// The content of a database container page: title node + database node
// referencing the source. The node is a positional view onto the source —
// it carries sourceId, the source holds the real data.
function databasePageContent(sourceId: ID, name: string): JSONContent {
  const view = makeDefaultView("table", "Table");
  return {
    type: "doc",
    content: [
      { type: "title", content: name ? [{ type: "text", text: name }] : [] },
      {
        type: "database",
        attrs: {
          id: newId(),
          sourceId,
          pageId: null, // resolves via source.pageId
          title: name,
          views: [view],
          activeViewId: view.id,
        },
      },
    ],
  };
}

// The container page that OWNS a database. sourceId stays null — this page is
// NOT a row, it hosts a database. The source (created separately) points back
// via source.pageId. Content is seeded with the database node.
export function makeDatabasePage(opts: {
  sourceId: ID;
  name?: string;
  parentId?: ID | null;
  category?: PageCategory;
}): Page {
  const name = opts.name ?? "Untitled";
  return {
    ...makePage({
      title: name,
      parentId: opts.parentId ?? null,
      category: opts.category ?? "Private",
    }),
    content: databasePageContent(opts.sourceId, name),
    settings: { width: "medium", text: "normal", locked: true }, // Database page should not be editable
    // sourceId stays null (from makePage) — the container is NOT a row.
  };
}
