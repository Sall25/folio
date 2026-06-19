import type { ID, Version } from "../types";
import { newId } from "../lib/id";


export function snapshotVersion(pageId: ID, title: string, content: Version["content"]) {
  const version: Version = {
    id: newId(),                 // client-generated — same id optimistic AND server
    pageId,
    title,
    content,
    createdAt: Date.now(),
    name: null,
  };
  return version
}