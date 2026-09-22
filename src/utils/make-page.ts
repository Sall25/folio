import type { Page, PageCategory, ID, PageCover } from "src/types";
import { newId } from "src/lib/id";
import type { JSONContent } from "@tiptap/core";
import { makeDefaultView } from "src/utils/make-default-view";

function generalAccessForCategory(category: PageCategory): {
  generalAccess: Page["generalAccess"];
  generalAccessRole: Page["generalAccessRole"];
} {
  switch (category) {
    case "Shared":
      return { generalAccess: "workspace", generalAccessRole: "view" };
    case "Teamspaces":
      return { generalAccess: "teamspace", generalAccessRole: "view" };
    default:
      return { generalAccess: "private", generalAccessRole: "view" };
  }
}

// Base seeder — a valid empty page. ownerId AND workspaceId MUST be supplied
// by the caller. teamspaceId is advisory: the server trigger recomputes it
// from the page's parent/source/root position on insert, so it's only here to
// keep the optimistic cache entry accurate until the refetch lands.
export function makePage(opts: {
  ownerId: ID | null;
  workspaceId: ID;
  teamspaceId?: ID | null;
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
    workspaceId: opts.workspaceId,
    teamspaceId: opts.teamspaceId ?? null,
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

// A child inherits the parent's category, owner, workspace AND teamspace.
export function makeChildPage(parent: Page, title = "New Page"): Page {
  return makePage({
    ownerId: parent.ownerId,
    workspaceId: parent.workspaceId,
    teamspaceId: parent.teamspaceId,
    title,
    parentId: parent.id,
    category: parent.category,
  });
}

export function makePageFromTemplate(
  template: Page,
  opts: {
    ownerId: ID;
    workspaceId: ID;
    teamspaceId?: ID | null;
    parentId?: ID | null;
    category?: PageCategory;
  },
): Page {
  return {
    ...makePage({
      ownerId: opts.ownerId,
      workspaceId: opts.workspaceId,
      teamspaceId: opts.teamspaceId ?? null,
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
  workspaceId: ID;
  teamspaceId?: ID | null;
  sourceId: ID;
  name?: string;
  parentId?: ID | null;
  category?: PageCategory;
}): Page {
  const name = opts.name ?? "Untitled";
  return {
    ...makePage({
      ownerId: opts.ownerId,
      workspaceId: opts.workspaceId,
      teamspaceId: opts.teamspaceId ?? null,
      title: name,
      parentId: opts.parentId ?? null,
      category: opts.category ?? "Private",
    }),
    content: databasePageContent(opts.sourceId, name),
    settings: { width: "full", text: "normal", locked: false },
    cover: {
      iconName: "table",
      coverImage: null,
      target: "Icons",
      color: null,
      gradient: null,
      positionY: null,
    },
  };
}
