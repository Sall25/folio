import type { Page, PageCategory, ID, PageCover } from "src/types";
import { newId } from "src/lib/id";
import type { JSONContent } from "@tiptap/core";
import { makeDefaultView } from "src/utils/make-default-view";

// General access defaults per category — mirrors the migration's backfill, so a
// page created client-side resolves the same way the DB would.
function generalAccessForCategory(category: PageCategory): {
  generalAccess: Page["generalAccess"];
  generalAccessRole: Page["generalAccessRole"];
} {
  switch (category) {
    case "Shared":
      return { generalAccess: "workspace", generalAccessRole: "view" };
    case "Teamspaces":
      return { generalAccess: "teamspace", generalAccessRole: "view" };
    // Private / Favorites / Template → owner + explicit grants only.
    default:
      return { generalAccess: "private", generalAccessRole: "view" };
  }
}

// Base seeder — a valid empty page. ownerId MUST be supplied by the caller (the
// current person's id); it's what grants the creator full access under the
// category-driven permission model.
export function makePage(opts: {
  ownerId: ID | null;
  title?: string;
  parentId?: ID | null;
  category?: PageCategory;
  cover?: PageCover;
}): Page {
  const title = opts.title ?? "";
  const category = opts.category ?? "Private";
  const access = generalAccessForCategory(category);

  return {
    id: newId(),
    title,
    ownerId: opts.ownerId,
    workspaceId: "workspace_default", // single workspace; DB default matches
    parentId: opts.parentId ?? null,
    category,
    ...access,
    settings: { width: "medium", text: "normal", locked: false },
    cover: opts.cover ?? {
      iconName: null,
      coverImage: null,
      target: null,
      color: null,
      gradient: null,
      positionY: null,
    },
    content: {
      type: "doc",
      content: [
        { type: "title", content: [] },
        { type: "paragraph", content: [] },
      ],
    },
    createdAt: Date.now(),
    updatedAt: null,
    sourceId: null,
    values: null,
  };
}

// A child inherits the parent's category AND owner — same section, same owner.
export function makeChildPage(parent: Page, title = "New Page"): Page {
  return makePage({
    ownerId: parent.ownerId,
    title,
    parentId: parent.id,
    category: parent.category,
  });
}

// Clone a template into a new page. The instance is owned by whoever creates it
// (ownerId passed in), NOT the template's owner — a shared template shouldn't
// make every instance owned by the template author.
export function makePageFromTemplate(
  template: Page,
  opts: { ownerId: ID; parentId?: ID | null; category?: PageCategory },
): Page {
  return {
    ...makePage({
      ownerId: opts.ownerId,
      title: template.title,
      parentId: opts.parentId ?? null,
      category: opts.category ?? "Private",
    }),
    content: structuredClone(template.content),
    cover: { ...template.cover },
    settings: { ...template.settings },
  };
}

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
          pageId: null,
          title: name,
          views: [view],
          activeViewId: view.id,
        },
      },
    ],
  };
}

export function makeDatabasePage(opts: {
  ownerId: ID;
  sourceId: ID;
  name?: string;
  parentId?: ID | null;
  category?: PageCategory;
}): Page {
  const name = opts.name ?? "Untitled";
  return {
    ...makePage({
      ownerId: opts.ownerId,
      title: name,
      parentId: opts.parentId ?? null,
      category: opts.category ?? "Private",
    }),
    content: databasePageContent(opts.sourceId, name),
    settings: { width: "full", text: "normal", locked: false },
    cover: {
      iconName: "table",
      coverImage: null,
      target: null,
      color: null,
      gradient: null,
      positionY: null,
    },
  };
}
