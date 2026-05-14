/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ID,
  PropertyType,
  DatabaseProperty,
  DatabaseView,
  TableView,
  DatabaseAttrs,
} from "../types/types";
import { mergeAttributes, Node } from "@tiptap/core";
import {
  makeId,
  now,
  makeCellNode,
  makeDefaultDatabase,
  makeDefaultView,
} from "../utils";
import { DEFAULT_CONFIGS } from "../types/config";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DatabaseNodeView } from "./database-node-view";

import type { FilterRule } from "../types/filter-types";
import { formulaSyncPlugin } from "../plugins";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    database: {
      insertDatabase: () => ReturnType;
      addDatabaseRecord: (nodeId: ID) => ReturnType;
      deleteDatabaseRecord: (nodeId: ID, recordId: ID) => ReturnType;
      updateDatabaseCell: (
        nodeId: ID,
        recordId: ID,
        propertyId: ID,
        value: unknown,
      ) => ReturnType;
      addDatabaseProperty: (
        nodeId: ID,
        type: PropertyType,
        name?: string,
      ) => ReturnType;
      deleteDatabaseProperty: (nodeId: ID, propertyId: ID) => ReturnType;
      updateDatabaseProperty: (
        nodeId: ID,
        propertyId: ID,
        patch: Partial<Omit<DatabaseProperty, "id">>,
      ) => ReturnType;
      reorderDatabaseProperties: (nodeId: ID, orderedIds: ID[]) => ReturnType;
      updateDatabaseAttrs: (
        nodeId: ID,
        patch: Partial<Omit<DatabaseAttrs, "id">>,
      ) => ReturnType;
      addDatabaseView: (
        nodeId: ID,
        type: DatabaseView["type"],
        name: string,
      ) => ReturnType;
      updateDatabaseView: (
        nodeId: ID,
        viewId: ID,
        patch: Partial<Omit<DatabaseView, "id">>,
      ) => ReturnType;
      deleteDatabaseView: (nodeId: ID, viewId: ID) => ReturnType;
      requestDeleteDatabaseRecord: (recordId: ID) => ReturnType;
      duplicateDatabaseProperty: (nodeId: ID, propertyId: ID) => ReturnType;
      freezeDatabaseProperty: (
        nodeId: ID,
        viewId: ID,
        propertyId: ID | null,
      ) => ReturnType;
      toggleUnwrapProperty: (
        nodeId: ID,
        viewId: ID,
        propertyId: ID,
      ) => ReturnType;
      hideProperty: (nodeId: ID, viewId: ID, propertyId: ID) => ReturnType;
      showProperty: (nodeId: ID, viewId: ID, propertyId: ID) => ReturnType;
      sortByProperty: (
        nodeId: ID,
        viewId: ID,
        propertyId: ID,
        direction: "asc" | "desc",
      ) => ReturnType;
      removeSortByProperty: (
        nodeId: ID,
        viewId: ID,
        propertyId: ID,
      ) => ReturnType;
      filterByProperty: (
        nodeId: ID,
        viewId: ID,
        rule: FilterRule,
      ) => ReturnType;
      groupByProperty: (nodeId: ID, viewId: ID, propertyId: ID) => ReturnType;
    };
  }
}

export const DatabaseNode = Node.create({
  name: "database",
  group: "block",
  content: "databaseRecord+", // at least one record always
  atom: false,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      id: { default: null },
      title: { default: "Untitled database" },
      properties: { default: [] },
      views: { default: [] },
      activeViewId: { default: null },
      icon: { default: null },
      cover: { default: null },
      templateId: { default: null },
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
    return ReactNodeViewRenderer(DatabaseNodeView);
  },

  addProseMirrorPlugins() {
    return [formulaSyncPlugin];
  },

  addCommands() {
    return {
      insertDatabase:
        () =>
        ({ commands }) => {
          const { attrs, content } = makeDefaultDatabase();
          return commands.insertContent({ type: "database", attrs, content });
        },

      addDatabaseRecord:
        (nodeId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          let dbPos: number | null = null;
          let dbNode: any = null;

          doc.descendants((node, pos) => {
            if (node.type.name === "database" && node.attrs.id === nodeId) {
              dbPos = pos;
              dbNode = node;
              return false;
            }
          });

          if (dbPos === null || dbNode === null) return false;

          const newRecord = state.schema.nodeFromJSON({
            type: "databaseRecord",
            attrs: { id: makeId(), createdAt: now(), updatedAt: now() },
            content: (dbNode.attrs.properties as DatabaseProperty[]).map(
              makeCellNode,
            ),
          });

          // Insert after last record
          const insertPos = dbPos + 1 + dbNode.content.size;
          tr.insert(insertPos, newRecord);

          if (dispatch) dispatch(tr);
          return true;
        },

      updateDatabaseCell:
        (nodeId: ID, recordId: ID, propertyId: ID, value: unknown) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          doc.descendants((node, pos) => {
            if (node.type.name !== "databaseRecord") return;
            if (node.attrs.id !== recordId) return;

            // Verify it belongs to this database
            const $pos = doc.resolve(pos);
            if ($pos.parent.attrs.id !== nodeId) return;

            node.forEach((cell, offset) => {
              if (cell.attrs.propertyId !== propertyId) return;
              tr.setNodeMarkup(pos + 1 + offset, undefined, {
                ...cell.attrs,
                value,
              });
            });

            return false;
          });

          if (dispatch) dispatch(tr);
          return true;
        },

      deleteDatabaseRecord:
        (nodeId: ID, recordId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          doc.descendants((node, pos) => {
            if (node.type.name !== "databaseRecord") return;
            if (node.attrs.id !== recordId) return;

            const $pos = doc.resolve(pos);
            if ($pos.parent.attrs.id !== nodeId) return;

            // Guard — never delete the last record
            if ($pos.parent.childCount <= 1) return false;

            tr.delete(pos, pos + node.nodeSize);
            return false;
          });

          if (dispatch) dispatch(tr);
          return true;
        },

      addDatabaseProperty:
        (nodeId: ID, type: PropertyType, name?: string) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          let dbPos: number | null = null;
          let dbNode: any = null;

          // Collect record positions BEFORE any mutations
          const recordPositions: number[] = [];

          doc.descendants((node, pos) => {
            if (node.type.name === "database" && node.attrs.id === nodeId) {
              dbPos = pos;
              dbNode = node;
            }
            if (node.type.name === "databaseRecord") {
              const $pos = doc.resolve(pos);
              if ($pos.parent.attrs.id === nodeId) {
                recordPositions.push(pos);
              }
            }
          });

          if (dbPos === null || dbNode === null) return false;

          const newProp: DatabaseProperty = {
            id: makeId(),
            name:
              name ??
              type.charAt(0).toUpperCase() + type.slice(1).replace("_", " "),
            config: DEFAULT_CONFIGS[type],
            width: 160,
          };

          const updatedViews = (dbNode.attrs.views as DatabaseView[]).map(
            (v) => {
              if (v.type !== "table") return v;
              return {
                ...v,
                propertyOrder: [...(v as TableView).propertyOrder, newProp.id],
              };
            },
          );

          // 1. Update database attrs
          tr.setNodeMarkup(dbPos, undefined, {
            ...dbNode.attrs,
            properties: [...dbNode.attrs.properties, newProp],
            views: updatedViews,
          });

          // 2. Insert cells in reverse order to avoid position shifting
          const newCellNode = state.schema.nodeFromJSON(makeCellNode(newProp));

          for (const recordPos of recordPositions.reverse()) {
            const recordNode = doc.nodeAt(recordPos);
            if (!recordNode) continue;
            // +1 to enter the record, + content.size to append after last cell
            const insertPos = recordPos + 1 + recordNode.content.size;
            tr.insert(insertPos, newCellNode.copy(newCellNode.content));
          }

          if (dispatch) dispatch(tr);
          return true;
        },
      // addDatabaseProperty:
      //   (nodeId: ID, type: PropertyType, name?: string) =>
      //   ({ state, dispatch }) => {
      //     const { tr, doc } = state;

      //     let dbPos: number | null = null;
      //     let dbNode: any = null;

      //     doc.descendants((node, pos) => {
      //       if (node.type.name === "database" && node.attrs.id === nodeId) {
      //         dbPos = pos;
      //         dbNode = node;
      //         return false;
      //       }
      //     });

      //     if (dbPos === null || dbNode === null) return false;

      //     const newProp: DatabaseProperty = {
      //       id: makeId(),
      //       name:
      //         name ??
      //         type.charAt(0).toUpperCase() + type.slice(1).replace("_", " "),
      //       config: DEFAULT_CONFIGS[type],
      //       width: 160,
      //     };

      //     // Update database attrs
      //     const updatedViews = (dbNode.attrs.views as DatabaseView[]).map(
      //       (v) => {
      //         if (v.type !== "table") return v;
      //         return {
      //           ...v,
      //           propertyOrder: [...(v as TableView).propertyOrder, newProp.id],
      //         };
      //       },
      //     );

      //     tr.setNodeMarkup(dbPos, undefined, {
      //       ...dbNode.attrs,
      //       properties: [...dbNode.attrs.properties, newProp],
      //       views: updatedViews,
      //     });

      //     // Insert new cell into every existing record
      //     const newCellNode = state.schema.nodeFromJSON(makeCellNode(newProp));

      //     doc.descendants((node, pos) => {
      //       if (node.type.name !== "databaseRecord") return;

      //       const $pos = doc.resolve(pos);
      //       if ($pos.parent.attrs.id !== nodeId) return;

      //       const insertPos = pos + 1 + node.content.size;
      //       tr.insert(insertPos, newCellNode.copy(newCellNode.content));
      //     });

      //     if (dispatch) dispatch(tr);
      //     return true;
      //   },

      deleteDatabaseProperty:
        (nodeId: ID, propertyId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          let dbPos: number | null = null;
          let dbNode: any = null;

          doc.descendants((node, pos) => {
            if (node.type.name === "database" && node.attrs.id === nodeId) {
              dbPos = pos;
              dbNode = node;
              return false;
            }
          });

          if (dbPos === null || dbNode === null) return false;

          // Guard — never delete the title property
          const prop = (dbNode.attrs.properties as DatabaseProperty[]).find(
            (p) => p.id === propertyId,
          );
          if (prop?.config.type === "title") return false;

          // 1. Collect cell positions BEFORE any mutations
          const toDelete: Array<{ from: number; to: number }> = [];

          doc.descendants((node, pos) => {
            if (node.type.name !== "databaseRecord") return;

            const $pos = doc.resolve(pos);
            if ($pos.parent.attrs.id !== nodeId) return;

            node.forEach((cell, offset) => {
              if (cell.attrs.propertyId !== propertyId) return;
              const cellPos = pos + 1 + offset;
              toDelete.push({ from: cellPos, to: cellPos + cell.nodeSize });
            });
          });

          // 2. Update database attrs
          const updatedViews = (dbNode.attrs.views as DatabaseView[]).map(
            (v) => {
              if (v.type !== "table") return v;
              return {
                ...v,
                propertyOrder: (v as TableView).propertyOrder.filter(
                  (id) => id !== propertyId,
                ),
              };
            },
          );

          tr.setNodeMarkup(dbPos, undefined, {
            ...dbNode.attrs,
            properties: (dbNode.attrs.properties as DatabaseProperty[]).filter(
              (p) => p.id !== propertyId,
            ),
            views: updatedViews,
          });

          // 3. Delete cells in reverse order to avoid position shifting
          for (const { from, to } of toDelete.sort((a, b) => b.from - a.from)) {
            tr.delete(from, to);
          }

          if (dispatch) dispatch(tr);
          return true;
        },

      updateDatabaseProperty:
        (
          nodeId: ID,
          propertyId: ID,
          patch: Partial<Omit<DatabaseProperty, "id">>,
        ) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;

            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              properties: (node.attrs.properties as DatabaseProperty[]).map(
                (p) => (p.id !== propertyId ? p : { ...p, ...patch }),
              ),
            });

            return false;
          });

          if (dispatch) dispatch(tr);
          return true;
        },

      reorderDatabaseProperties:
        (nodeId: ID, orderedIds: ID[]) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          let dbPos: number | null = null;
          let dbNode: any = null;

          doc.descendants((node, pos) => {
            if (node.type.name === "database" && node.attrs.id === nodeId) {
              dbPos = pos;
              dbNode = node;
              return false;
            }
          });

          if (dbPos === null || dbNode === null) return false;

          // Reorder properties in attrs
          const propMap = new Map(
            (dbNode.attrs.properties as DatabaseProperty[]).map((p) => [
              p.id,
              p,
            ]),
          );
          const reordered = orderedIds
            .map((id) => propMap.get(id))
            .filter((p): p is DatabaseProperty => !!p);
          const missing = (
            dbNode.attrs.properties as DatabaseProperty[]
          ).filter((p) => !orderedIds.includes(p.id));

          tr.setNodeMarkup(dbPos, undefined, {
            ...dbNode.attrs,
            properties: [...reordered, ...missing],
          });

          // Reorder cells inside each record to match
          doc.descendants((node, pos) => {
            if (node.type.name !== "databaseRecord") return;

            const $pos = doc.resolve(pos);
            if ($pos.parent.attrs.id !== nodeId) return;

            const cellMap = new Map<string, any>();
            node.forEach((cell, offset) => {
              cellMap.set(cell.attrs.propertyId, { cell, offset });
            });

            const reorderedCells = orderedIds
              .map((id) => cellMap.get(id)?.cell)
              .filter(Boolean);
            const missingCells = [] as any[];
            node.forEach((cell) => {
              if (!orderedIds.includes(cell.attrs.propertyId))
                missingCells.push(cell);
            });

            const allCells = [...reorderedCells, ...missingCells];
            tr.replaceWith(pos + 1, pos + 1 + node.content.size, allCells);
          });

          if (dispatch) dispatch(tr);
          return true;
        },
      updateDatabaseAttrs:
        (nodeId: ID, patch: Partial<Omit<DatabaseAttrs, "id">>) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...patch });
            return false;
          });

          if (dispatch) dispatch(tr);
          return true;
        },

      addDatabaseView:
        (nodeId: ID, type: DatabaseView["type"], name: string) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;

            // Pass properties so board view can auto-pick groupByPropertyId
            const newView = makeDefaultView(
              type,
              name,
              node.attrs.properties as DatabaseProperty[],
            );

            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: [...node.attrs.views, newView],
              activeViewId: newView.id,
            });
            return false;
          });

          if (dispatch) dispatch(tr);
          return true;
        },

      updateDatabaseView:
        (nodeId: ID, viewId: ID, patch: Partial<Omit<DatabaseView, "id">>) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;

            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) =>
                v.id !== viewId ? v : { ...v, ...patch },
              ),
            });
            return false;
          });

          if (dispatch) dispatch(tr);
          return true;
        },

      deleteDatabaseView:
        (nodeId: ID, viewId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;

            const views = (node.attrs.views as DatabaseView[]).filter(
              (v) => v.id !== viewId,
            );
            // Guard — always keep at least one view
            if (views.length === 0) return false;

            const activeViewId =
              node.attrs.activeViewId === viewId
                ? views[0].id
                : node.attrs.activeViewId;

            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views,
              activeViewId,
            });
            return false;
          });

          if (dispatch) dispatch(tr);
          return true;
        },
      requestDeleteDatabaseRecord:
        (recordId) =>
        ({ state, dispatch }) => {
          const tr = state.tr.setMeta("requestDeleteRecord", { recordId });
          if (dispatch) dispatch(tr);
          return true;
        },
      duplicateDatabaseProperty:
        (nodeId: ID, propertyId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;

          let dbPos: number | null = null;
          let dbNode: any = null;

          doc.descendants((node, pos) => {
            if (node.type.name === "database" && node.attrs.id === nodeId) {
              dbPos = pos;
              dbNode = node;
              return false;
            }
          });

          if (dbPos === null || dbNode === null) return false;

          const original = (dbNode.attrs.properties as DatabaseProperty[]).find(
            (p) => p.id === propertyId,
          );
          if (!original) return false;

          const duplicate: DatabaseProperty = {
            ...original,
            id: makeId(),
            name: `${original.name} (copy)`,
          };

          const properties = dbNode.attrs.properties as DatabaseProperty[];
          const idx = properties.findIndex((p) => p.id === propertyId);
          const newProperties = [
            ...properties.slice(0, idx + 1),
            duplicate,
            ...properties.slice(idx + 1),
          ];

          const updatedViews = (dbNode.attrs.views as DatabaseView[]).map(
            (v) => {
              if (v.type !== "table") return v;
              const order = (v as TableView).propertyOrder;
              const orderIdx = order.indexOf(propertyId);
              return {
                ...v,
                propertyOrder: [
                  ...order.slice(0, orderIdx + 1),
                  duplicate.id,
                  ...order.slice(orderIdx + 1),
                ],
              };
            },
          );

          tr.setNodeMarkup(dbPos, undefined, {
            ...dbNode.attrs,
            properties: newProperties,
            views: updatedViews,
          });

          const recordPositions: { pos: number; node: any }[] = [];
          doc.descendants((node, pos) => {
            if (node.type.name !== "databaseRecord") return;
            const $pos = doc.resolve(pos);
            if ($pos.parent.attrs.id !== nodeId) return;
            recordPositions.push({ pos, node });
          });

          const newCellNode = state.schema.nodeFromJSON(
            makeCellNode(duplicate),
          );

          for (const { pos, node: record } of recordPositions.reverse()) {
            let insertOffset = 1 + record.content.size;
            let offset = 1;
            record.forEach((cell: any) => {
              if (cell.attrs.propertyId === propertyId) {
                insertOffset = offset + cell.nodeSize;
              }
              offset += cell.nodeSize;
            });
            tr.insert(
              pos + insertOffset,
              newCellNode.copy(newCellNode.content),
            );
          }

          if (dispatch) dispatch(tr);
          return true;
        },

      freezeDatabaseProperty:
        (nodeId: ID, viewId: ID, propertyId: ID | null) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;
          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) =>
                v.id !== viewId || v.type !== "table"
                  ? v
                  : { ...v, frozenPropertyId: propertyId },
              ),
            });
            return false;
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      toggleUnwrapProperty:
        (nodeId: ID, viewId: ID, propertyId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;
          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) => {
                if (v.id !== viewId || v.type !== "table") return v;
                const unwrapped = (v as TableView).unwrappedProperties ?? [];
                const isUnwrapped = unwrapped.includes(propertyId);
                return {
                  ...v,
                  unwrappedProperties: isUnwrapped
                    ? unwrapped.filter((id) => id !== propertyId)
                    : [...unwrapped, propertyId],
                };
              }),
            });
            return false;
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      hideProperty:
        (nodeId: ID, viewId: ID, propertyId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;
          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) => {
                if (v.id !== viewId) return v;
                const hidden = v.hiddenProperties ?? [];
                if (hidden.includes(propertyId)) return v;
                return { ...v, hiddenProperties: [...hidden, propertyId] };
              }),
            });
            return false;
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      showProperty:
        (nodeId: ID, viewId: ID, propertyId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;
          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) => {
                if (v.id !== viewId) return v;
                return {
                  ...v,
                  hiddenProperties: v.hiddenProperties.filter(
                    (id) => id !== propertyId,
                  ),
                };
              }),
            });
            return false;
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      sortByProperty:
        (nodeId: ID, viewId: ID, propertyId: ID, direction: "asc" | "desc") =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;
          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) => {
                if (v.id !== viewId) return v;
                const sorts = v.sorts.filter(
                  (s) => s.propertyId !== propertyId,
                );
                return {
                  ...v,
                  sorts: [...sorts, { id: makeId(), propertyId, direction }],
                };
              }),
            });
            return false;
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      removeSortByProperty:
        (nodeId: ID, viewId: ID, propertyId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;
          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) =>
                v.id !== viewId
                  ? v
                  : {
                      ...v,
                      sorts: v.sorts.filter((s) => s.propertyId !== propertyId),
                    },
              ),
            });
            return false;
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      filterByProperty:
        (nodeId: ID, viewId: ID, rule: FilterRule) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;
          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) => {
                if (v.id !== viewId) return v;
                const filters =
                  v.filters.length > 0
                    ? v.filters.map((g, i) =>
                        i === 0 ? { ...g, rules: [...g.rules, rule] } : g,
                      )
                    : [
                        {
                          id: makeId(),
                          conjunction: "and" as const,
                          rules: [rule],
                        },
                      ];
                return { ...v, filters };
              }),
            });
            return false;
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      groupByProperty:
        (nodeId: ID, viewId: ID, propertyId: ID) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state;
          doc.descendants((node, pos) => {
            if (node.type.name !== "database" || node.attrs.id !== nodeId)
              return;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              views: (node.attrs.views as DatabaseView[]).map((v) =>
                v.id !== viewId || v.type !== "board"
                  ? v
                  : { ...v, groupByPropertyId: propertyId },
              ),
            });
            return false;
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});
