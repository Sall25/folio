import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ID } from "../types/types";
import { DatabaseNodeView } from "./database-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    database: {
      /** Insert an atom database node referencing an existing data source. */
      insertDatabaseWithSource: (sourceId: ID, pageId?: number) => ReturnType;
      insertDatabaseNode: () => ReturnType;
    };
  }
}

export const DatabaseNode = Node.create({
  name: "database",
  group: "block",
  atom: true,
  content: "block*",
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      id: { default: null },
      sourceId: { default: null },
      title: { default: "Untitled" },
      views: { default: [] },
      activeViewId: { default: null },
      icon: { default: null },
      cover: { default: null },
      templateId: { default: null },
      hideTitle: { default: null },
      pageId: { default: null },
      properties: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="database"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "database" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DatabaseNodeView);
  },

  addCommands() {
    return {
      insertDatabaseWithSource:
        (sourceId: ID, pageId?: number) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              id: crypto.randomUUID(),
              sourceId,
              title: "Untitled",
              views: [
                {
                  id: crypto.randomUUID(),
                  name: "Table",
                  type: "table",
                  filters: [],
                  sorts: [],
                  hiddenProperties: [],
                  propertyOrder: [],
                },
              ],
              activeViewId: null,
              pageId: pageId ?? null,
            },
          }),
      insertDatabaseNode:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: "database",
            attrs: {
              id: crypto.randomUUID(),
              sourceId: null, // ← no source → picker shows
              pageId: null,
              title: "Untitled",
              views: [
                {
                  id: crypto.randomUUID(),
                  name: "Table",
                  type: "table",
                  filters: [],
                  sorts: [],
                  hiddenProperties: [],
                  propertyOrder: [],
                },
              ],
              activeViewId: null,
            },
          }),
    };
  },
});
