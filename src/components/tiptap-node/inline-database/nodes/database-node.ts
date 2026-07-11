// 3-node tree so rows and cells are real ProseMirror nodes ("channels"), while
// the DataSource stays the single source of truth for values and row existence:
//
//   database         content: "databaseRecord*"
//     databaseRecord content: "databaseCell*"   attrs: { recordId, sourceId, databaseId }
//       databaseCell content: "inline*"         attrs: { recordId, propertyId, databaseId }
//
// Cross-NodeView data (properties, records, setCellValue, column widths) is
// shared via editor storage (the databaseBridge), NOT React context — context
// can't cross the NodeView boundary. databaseId on record/cell nodes tells them
// which database entry to read from the bridge.

import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ID } from "src/types";
import { Plugin } from "@tiptap/pm/state";
import { DatabaseNodeViewLazy } from "./database-node-view-lazy";
import { DatabaseRecordNodeViewLazy } from "./database-record-node-view-lazy";
import { DatabaseCellNodeViewLazy } from "./database-cell-node-view-lazy";
import {
  createDatabaseStorage,
  type DatabaseStorage,
} from "../utils/database-bridge";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    database: {
      insertDatabaseWithSource: (sourceId: ID, pageId?: ID) => ReturnType;
      insertDatabaseNode: () => ReturnType;
    };
  }
}

export const DatabaseNode = Node.create<unknown, DatabaseStorage>({
  name: "database",
  group: "block",
  content: "databaseRecord*",
  selectable: false,
  draggable: true,
  isolating: true,

  addStorage() {
    // The bridge storage lives here so all database/record/cell NodeViews can
    // reach it via editor.storage.databaseBridge.
    return createDatabaseStorage();
  },

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
      0,
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
            mousedown: (_view, event) => {
              const target = event.target as HTMLElement;
              // TEMP: plugin disabled for diagnosis — always pass clicks
              // through so we can tell whether THIS plugin is what blocks cell
              // editing. If cells become editable now, the swallow logic below
              // (restored after) is the culprit.
              void target;
              return false;
              /* eslint-disable no-unreachable */
              // Editable controls always pass through.
              if (target.closest("input, textarea, [contenteditable='true']")) {
                return false;
              }
              if (target.closest('[data-type="database-cell"]')) {
                return false;
              }
              if (target.closest('[data-type="database"]')) {
                event.preventDefault();
                return true;
              }
              return false;
              /* eslint-enable no-unreachable */
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
              sourceId: null,
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

export const DatabaseRecordNode = Node.create({
  name: "databaseRecord",
  content: "databaseCell*",
  isolating: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      recordId: { default: null },
      sourceId: { default: null },
      databaseId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="database-record"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "database-record" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DatabaseRecordNodeViewLazy);
  },
});

export const DatabaseCellNode = Node.create({
  name: "databaseCell",
  content: "inline*",
  isolating: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      recordId: { default: null },
      propertyId: { default: null },
      databaseId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="database-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "database-cell" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DatabaseCellNodeViewLazy);
  },
});

export const DatabaseNodes = [
  DatabaseNode,
  DatabaseRecordNode,
  DatabaseCellNode,
];
