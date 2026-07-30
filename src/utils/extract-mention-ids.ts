import type { JSONContent } from "@tiptap/core";

export function extractMentionIds(
  json: JSONContent | null | undefined,
): string[] {
  console.log("EXTRACTOR v2 running");
  const ids: string[] = [];
  if (!json) return ids;
  const walk = (node: JSONContent | undefined) => {
    if (!node) return;
    if (node.type === "mention" && node.attrs?.id) {
      ids.push(String(node.attrs.id));
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(json);
  return [...new Set(ids)];
}
