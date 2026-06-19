import type { PersonValue } from "src/types";

// TODO: replace with the real workspace members source ("like Notion").
// Could be a context, a query hook, or whatever created_by/edited_by resolves
// against. Must return everyone selectable, not just the already-picked people.
export function useWorkspacePeople(): PersonValue[] {
  return [
    { id: "u_1", name: "Alex Rivera" },
    { id: "u_2", name: "Sam Chen" },
    { id: "u_3", name: "Jordan Lee" },
  ];
}
