import type { Editor } from "@tiptap/react";
import { readDatabaseData } from "./database-bridge";

// Which database block a record was opened FROM, so only that block marks
// the open record (extensions/database-open-record.ts). The same record can
// show in several blocks on a page (a linked view, the same view placed
// twice); opening it from one shouldn't mark it in the others.
//
// A record is opened by a click, so its block is the one the last pointerdown
// inside a database landed in. Opened any other way (sidebar, relation, link)
// there's no opener, and every block marks it, as before.

let lastPointerBlock: Element | null = null;
let opener: { pageId: string; block: Element } | null = null;

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (e) => {
      const block = (e.target as Element | null)?.closest?.(
        ".react-renderer.node-database",
      );
      // Only clicks inside a database: a menu item ("Open in side peek") is
      // portaled outside it, and must keep the block its menu was opened in.
      if (block) lastPointerBlock = block;
    },
    true,
  );
}

/** Call when a database view opens a record (useOpenRecord, card menu). */
export function noteRecordOpener(pageId: string) {
  opener = lastPointerBlock ? { pageId, block: lastPointerBlock } : null;
}

/** The block `pageId` was opened from, or null when unknown. */
export function recordOpenerBlock(pageId: string): Element | null {
  return opener?.pageId === pageId ? opener.block : null;
}
/** Opening the next or previous record from the side / center view: it was
 *  opened from the same block. */
export function moveRecordOpener(pageId: string) {
  if (opener) opener = { pageId, block: opener.block };
}

/**
 * The records of the view `pageId` was opened from, in the order that view
 * shows them (its filters and sort), for stepping through them with the up
 * and down arrows of the side / center view. Null when it wasn't opened from
 * a database on screen.
 */
export function openerRecordOrder(pageId: string): string[] | null {
  const block = recordOpenerBlock(pageId);
  if (!block || !block.isConnected) return null;
  const root = block.closest(".ProseMirror") as
    | (HTMLElement & { editor?: Editor })
    | null;
  const editor = root?.editor;
  if (!editor || editor.isDestroyed) return null;

  let databaseId: string | null = null;
  try {
    const pos = editor.view.posAtDOM(block, 0);
    const at = editor.state.doc.nodeAt(pos);
    if (at?.type.name === "database") {
      databaseId = at.attrs.id as string;
    } else {
      const $pos = editor.state.doc.resolve(pos);
      for (let d = $pos.depth; d > 0; d--) {
        if ($pos.node(d).type.name === "database") {
          databaseId = $pos.node(d).attrs.id as string;
          break;
        }
      }
    }
  } catch {
    return null;
  }
  if (!databaseId) return null;

  const data = readDatabaseData(editor, databaseId);
  if (!data) return null;
  return data.sortedRecordIds.filter((id) => data.recordsById.has(id));
}
