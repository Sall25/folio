// import { mergeAttributes, Node } from "@tiptap/core";
// import type {
//   DatabaseAttrs,
//   DatabaseRow,
//   Filter,
//   Property,
//   Sort,
// } from "./types";
// import { ReactNodeViewRenderer } from "@tiptap/react";
// import type { EditorState, Transaction } from "@tiptap/pm/state";
// import { Node as PMNode } from "@tiptap/pm/model";
// import { DatabaseView } from "./database-view";

// declare module "@tiptap/core" {
//   interface Commands<ReturnType> {
//     database: {
//       insertDatabase: () => ReturnType;
//       updateDatabaseTitle: (id: string, title: string) => ReturnType;
//       updateDatabaseRows: (id: string, rows: DatabaseRow[]) => ReturnType;
//       updateDatabaseProperties: (
//         id: string,
//         properties: Property[],
//       ) => ReturnType;
//       updateDatabaseSorts: (id: string, sorts: Sort[]) => ReturnType;
//       updateDatabaseFilters: (id: string, filters: Filter[]) => ReturnType;
//       updateDatabaseGroupBy: (id: string, groupBy: string | null) => ReturnType;
//     };
//   }
// }

// const DEFAULT_PROPERTIES: Property[] = [
//   { id: "name", label: "Name", type: "text", visible: true, width: "30%" },
//   {
//     id: "status",
//     label: "Status",
//     type: "select",
//     visible: true,
//     width: "15%",
//     options: [
//       { label: "To do", color: "#E6F1FB" },
//       { label: "In progress", color: "#FAEEDA" },
//       { label: "Done", color: "#EAF3DE" },
//       { label: "Blocked", color: "#FCEBEB" },
//     ],
//   },
//   {
//     id: "priority",
//     label: "Priority",
//     type: "select",
//     visible: true,
//     width: "12%",
//     options: [
//       { label: "High", color: "#FCEBEB" },
//       { label: "Medium", color: "#FAEEDA" },
//       { label: "Low", color: "#EAF3DE" },
//     ],
//   },
//   {
//     id: "assignee",
//     label: "Assignee",
//     type: "text",
//     visible: true,
//     width: "15%",
//   },
//   {
//     id: "due_date",
//     label: "Due date",
//     type: "date",
//     visible: true,
//     width: "13%",
//   },
// ];

// function makeDefaultAttrs(): DatabaseAttrs {
//   return {
//     id: crypto.randomUUID(),
//     title: "Untitled database",
//     properties: DEFAULT_PROPERTIES,
//     rows: [
//       {
//         id: crypto.randomUUID(),
//         name: "First row",
//         status: "To do",
//         priority: "Medium",
//         assignee: "",
//         due_date: "",
//       },
//     ],
//     sorts: [],
//     filters: [],
//     groupBy: null,
//   };
// }

// function updateNodeAttr(
//   tr: Transaction,
//   state: EditorState,
//   nodeId: string,
//   patch: Partial<DatabaseAttrs>,
// ): boolean {
//   let found = false;
//   state.doc.descendants((node: PMNode, pos: number) => {
//     if (node.type.name === "database" && node.attrs.id === nodeId) {
//       tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...patch });
//       found = true;
//       return false;
//     }
//   });
//   return found;
// }

// export const DatabaseNode = Node.create({
//   name: "database",
//   group: "block",
//   atom: true, // treat the whole node as a single unit — cursor jumps over it
//   draggable: true,

//   addAttributes() {
//     return {
//       id: { default: null },
//       title: { default: "Untitled database" },
//       properties: { default: DEFAULT_PROPERTIES },
//       rows: { default: [] },
//       sorts: { default: [] },
//       filters: { default: [] },
//       groupBy: { default: null },
//     };
//   },

//   parseHTML() {
//     return [{ tag: 'div[data-type="database"]' }];
//   },

//   renderHTML({ HTMLAttributes }) {
//     return [
//       "div",
//       mergeAttributes({ "data-type": "database" }, HTMLAttributes),
//     ];
//   },

//   addNodeView() {
//     return ReactNodeViewRenderer(DatabaseView);
//   },

//   addCommands() {
//     return {
//       insertDatabase:
//         () =>
//         ({ commands }) => {
//           return commands.insertContent({
//             type: this.name,
//             attrs: makeDefaultAttrs(),
//           });
//         },

//       updateDatabaseTitle:
//         (id, title) =>
//         ({ tr, state }) => {
//           return updateNodeAttr(tr, state, id, { title });
//         },

//       updateDatabaseRows:
//         (id, rows) =>
//         ({ tr, state }) => {
//           return updateNodeAttr(tr, state, id, { rows });
//         },

//       updateDatabaseProperties:
//         (id, properties) =>
//         ({ tr, state }) => {
//           return updateNodeAttr(tr, state, id, { properties });
//         },

//       updateDatabaseSorts:
//         (id, sorts) =>
//         ({ tr, state }) => {
//           return updateNodeAttr(tr, state, id, { sorts });
//         },

//       updateDatabaseFilters:
//         (id, filters) =>
//         ({ tr, state }) => {
//           return updateNodeAttr(tr, state, id, { filters });
//         },

//       updateDatabaseGroupBy:
//         (id, groupBy) =>
//         ({ tr, state }) => {
//           return updateNodeAttr(tr, state, id, { groupBy });
//         },
//     };
//   },
// });
