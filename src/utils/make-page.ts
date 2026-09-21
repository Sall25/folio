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

// Base seeder — a valid empty page. ownerId AND workspaceId MUST be supplied by
// the caller (the current person's id and their current workspace). workspaceId
// is no longer hardcoded — a page created in the wrong workspace fails the
// workspace-scoped pages_select policy when read back after insert (403).
export function makePage(opts: {
  ownerId: ID | null;
  workspaceId: ID;
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

// A child inherits the parent's category, owner, AND workspace.
export function makeChildPage(parent: Page, title = "New Page"): Page {
  return makePage({
    ownerId: parent.ownerId,
    workspaceId: parent.workspaceId,
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
    parentId?: ID | null;
    category?: PageCategory;
  },
): Page {
  return {
    ...makePage({
      ownerId: opts.ownerId,
      workspaceId: opts.workspaceId,
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
