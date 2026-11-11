// A reader's own copy of a live code block ("Try it myself"), kept on their
// device under the block's id. Never sent anywhere.

export interface LiveCodeCopy {
  html: string;
  css: string;
  js: string;
}

const key = (blockId: string) => `folio:live-code:${blockId}`;

export function loadCopy(blockId: string): LiveCodeCopy | null {
  try {
    const raw = localStorage.getItem(key(blockId));
    return raw ? (JSON.parse(raw) as LiveCodeCopy) : null;
  } catch {
    return null;
  }
}

export function saveCopy(blockId: string, copy: LiveCodeCopy) {
  try {
    localStorage.setItem(key(blockId), JSON.stringify(copy));
  } catch {
    /* storage full or blocked: the copy lasts until the page closes */
  }
}

export function dropCopy(blockId: string) {
  try {
    localStorage.removeItem(key(blockId));
  } catch {
    /* nothing to drop */
  }
}
