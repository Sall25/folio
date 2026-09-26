import type { TFunction } from "i18next";
import type { DatabaseProperty, DatabaseView, ID } from "src/types";
import { DEFAULT_CONFIGS } from "src/types";
import { newId } from "src/lib/id";
import { makeDefaultView } from "src/components/tiptap-node/inline-database/utils";

// A showcase is a plain Folio database with a fixed starting schema.
// Entries are row pages (sourceId + values); the cover is the row page's own
// cover, which the gallery card already renders.
//
// Stable handles so the room UI can find each property without matching on
// (translated) names. Stored on the room (chat_rooms.showcase_keys), not on
// the source, so the DataSource type stays untouched.
export type ShowcaseKeys = {
  title: ID;
  description: ID;
  tags: ID;
  status: ID;
  author: ID;
  projectPage: ID;
  kudos: ID;
};

// Status item ids — fixed so the room can detect "moved to Shipped".
export const SHOWCASE_STATUS = {
  idea: "showcase-idea",
  inProgress: "showcase-in-progress",
  shipped: "showcase-shipped",
} as const;

// Every t() here has a default: these strings are SAVED into the database,
// so a missing translation must never be stored as a raw key.
export function makeShowcaseSchema(t: TFunction) {
  const keys: ShowcaseKeys = {
    title: newId(),
    description: newId(),
    tags: newId(),
    status: newId(),
    author: newId(),
    projectPage: newId(),
    kudos: newId(),
  };

  const properties: DatabaseProperty[] = [
    {
      id: keys.title,
      name: t("chat.showcase.props.title", "Title"),
      config: { type: "title" },
      width: 240,
    },
    {
      id: keys.description,
      name: t("chat.showcase.props.description", "Description"),
      config: DEFAULT_CONFIGS.text,
      width: 280,
    },
    {
      id: keys.tags,
      name: t("chat.showcase.props.tags", "Tags"),
      config: {
        ...DEFAULT_CONFIGS.multi_select,
        options: [
          {
            id: newId(),
            label: t("chat.showcase.tags.design", "Design"),
            color: "pink",
          },
          {
            id: newId(),
            label: t("chat.showcase.tags.code", "Code"),
            color: "blue",
          },
          {
            id: newId(),
            label: t("chat.showcase.tags.writing", "Writing"),
            color: "orange",
          },
          {
            id: newId(),
            label: t("chat.showcase.tags.research", "Research"),
            color: "teal",
          },
          {
            id: newId(),
            label: t("chat.showcase.tags.art", "Art"),
            color: "purple",
          },
        ],
      },
      width: 180,
    },
    {
      id: keys.status,
      name: t("chat.showcase.props.status", "Status"),
      config: {
        ...DEFAULT_CONFIGS.status,
        groups: [
          {
            id: "todo",
            label: t("chat.showcase.status.groupTodo", "Idea"),
            items: [
              {
                id: SHOWCASE_STATUS.idea,
                name: t("chat.showcase.status.idea", "Idea"),
                color: "gray",
                isDefault: true,
              },
            ],
          },
          {
            id: "inprogress",
            label: t("chat.showcase.status.groupInProgress", "In progress"),
            items: [
              {
                id: SHOWCASE_STATUS.inProgress,
                name: t("chat.showcase.status.inProgress", "In progress"),
                color: "blue",
              },
            ],
          },
          {
            id: "complete",
            label: t("chat.showcase.status.groupComplete", "Shipped"),
            items: [
              {
                id: SHOWCASE_STATUS.shipped,
                name: t("chat.showcase.status.shipped", "Shipped"),
                color: "green",
              },
            ],
          },
        ],
      },
      width: 150,
    },
    {
      id: keys.author,
      name: t("chat.showcase.props.author", "Author"),
      config: { ...DEFAULT_CONFIGS.person, limit: "single" },
      width: 160,
    },
    {
      id: keys.projectPage,
      name: t("chat.showcase.props.projectPage", "Project page"),
      config: DEFAULT_CONFIGS.url,
      width: 200,
    },
    {
      // Kudos = the people who gave 🔥. Count is the array length; toggling
      // is a normal setCellValue, so no extra table.
      id: keys.kudos,
      name: t("chat.showcase.props.kudos", "Kudos"),
      config: DEFAULT_CONFIGS.person,
      width: 140,
    },
  ];

  const gallery: DatabaseView = {
    ...makeDefaultView(
      "gallery",
      t("chat.showcase.views.gallery", "Gallery"),
      properties,
    ),
    hiddenProperties: [keys.description, keys.projectPage, keys.kudos],
  };
  const board: DatabaseView = {
    ...makeDefaultView(
      "board",
      t("chat.showcase.views.board", "Board"),
      properties,
    ),
    hiddenProperties: [keys.description, keys.projectPage, keys.kudos],
  };
  const feed: DatabaseView = {
    ...makeDefaultView(
      "list",
      t("chat.showcase.views.feed", "Feed"),
      properties,
    ),
    hiddenProperties: [keys.projectPage, keys.kudos],
  };

  return { keys, properties, views: [gallery, board, feed] };
}

// Container page content: title + database node, same shape as
// databasePageContent() in use-create-database, but with the showcase views.
export function showcasePageContent(
  sourceId: ID,
  name: string,
  views: DatabaseView[],
) {
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
          views,
          activeViewId: views[0]?.id ?? null,
        },
      },
    ],
  };
}
