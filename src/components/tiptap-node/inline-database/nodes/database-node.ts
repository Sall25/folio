import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ID } from "src/types";
import { DatabaseNodeViewLazy } from "./database-node-view-lazy";
import { Plugin } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    database: {
      /** Insert an atom database node referencing an existing data source. */
      insertDatabaseWithSource: (sourceId: ID, pageId?: ID) => ReturnType;
      insertDatabaseNode: () => ReturnType;
    };
  }
}

export const DatabaseNode = Node.create({
  name: "database",
  group: "block",
  atom: true,
  content: "block*",
  selectable: false,
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
      locked: { default: false },
      isLinked: { default: false },
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
    return ReactNodeViewRenderer(DatabaseNodeViewLazy);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              const target = event.target as HTMLElement;
              // let real editable controls through
              if (target.closest("input, textarea, [contenteditable='true']")) {
                return false;
              }
              // swallow clicks inside the database chrome so PM never selects
              if (target.closest('[data-type="database"]')) {
                event.preventDefault();
                return true; // tell PM we handled it
              }
              return false;
            },
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertDatabaseWithSource:
        (sourceId: ID, pageId?: ID) =>
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
              locked: false,
              isLinked: true,
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
              locked: false,
            },
          }),
    };
  },
});
