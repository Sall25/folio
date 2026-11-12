import * as Y from "yjs";

// Keeping a database's own page carrying its block exactly once.

// A database's own page is [title, database]: one block, showing the
// database the page belongs to. A page has turned up with that block twice
// (identical, same database): two copies of its first version merged — the
// server seeding it from JSON while a client already held its own copy.
// This takes the extra blocks out again, in the shared doc, so every client
// gets the same fix. Only blocks of the page's OWN databases, top level:
// two blocks showing one database on an ordinary page are on purpose, and
// a linked block (isLinked) is never touched.
//
// Returns how many blocks were removed.
export function dedupeOwnDatabases(
  doc: Y.Doc,
  ownSourceIds: ReadonlySet<string>,
  fragmentName = "default",
): number {
  if (ownSourceIds.size === 0) return 0;
  const fragment = doc.getXmlFragment(fragmentName);
  const seen = new Set<string>();
  const extra: number[] = [];
  fragment.toArray().forEach((child, index) => {
    if (!(child instanceof Y.XmlElement) || child.nodeName !== "database") {
      return;
    }
    const sourceId = child.getAttribute("sourceId") as unknown;
    const linked = child.getAttribute("isLinked") as unknown;
    if (typeof sourceId !== "string" || !ownSourceIds.has(sourceId)) return;
    if (linked === true || linked === "true") return;
    if (seen.has(sourceId)) extra.push(index);
    else seen.add(sourceId);
  });
  if (extra.length === 0) return 0;
  doc.transact(() => {
    // From the end, so the earlier indexes stay right.
    for (const index of extra.reverse()) fragment.delete(index, 1);
  });
  return extra.length;
}


/**
 * Puts back a block the page lost. A database's own page is [title,
 * database], but a client that opened the page before the server seeded it
 * wrote its own first version ([title, paragraph]); the server then found a
 * document that wasn't empty and never seeded, so the block was gone for
 * good. The client no longer does that (src/features/editor/first-version.ts),
 * and this heals the pages it already happened to: for each of the page's
 * own databases with no block in the document, the block from the page's
 * stored content (pages.content) is added back, right after the title so
 * there's no empty line above it.
 *
 * Returns how many blocks were added.
 */
export function restoreOwnDatabases(
  doc: Y.Doc,
  ownSourceIds: ReadonlySet<string>,
  content: unknown,
  fragmentName = "default",
): number {
  if (ownSourceIds.size === 0) return 0;
  const fragment = doc.getXmlFragment(fragmentName);
  // An empty document is seeded the usual way, not repaired.
  if (fragment.length === 0) return 0;

  const present = new Set<string>();
  for (const child of fragment.toArray()) {
    if (child instanceof Y.XmlElement && child.nodeName === "database") {
      const sourceId = child.getAttribute("sourceId") as unknown;
      if (typeof sourceId === "string") present.add(sourceId);
    }
  }

  const blocks = (content as { content?: unknown[] } | null)?.content;
  if (!Array.isArray(blocks)) return 0;

  const missing: Record<string, unknown>[] = [];
  for (const block of blocks) {
    const node = block as { type?: string; attrs?: Record<string, unknown> };
    if (node?.type !== "database" || !node.attrs) continue;
    const sourceId = node.attrs.sourceId;
    if (typeof sourceId !== "string") continue;
    if (!ownSourceIds.has(sourceId) || present.has(sourceId)) continue;
    present.add(sourceId);
    missing.push(node.attrs);
  }
  if (missing.length === 0) return 0;

  const first = fragment.get(0);
  const afterTitle =
    first instanceof Y.XmlElement && first.nodeName === "title" ? 1 : 0;
  doc.transact(() => {
    missing.forEach((attrs, i) => {
      // The node is an atom: its attributes are all it holds.
      const el = new Y.XmlElement("database");
      for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined) continue;
        el.setAttribute(key, value as string);
      }
      fragment.insert(afterTitle + i, [el]);
    });
  });
  return missing.length;
}
