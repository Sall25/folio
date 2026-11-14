import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Every way a page gets made, held to one rule.
//
// A page made on this device has nothing waiting for it on the collab
// server, so the editor must be told it was made here (local-pages:
// isCreatedHere). Without that it waits out the sync timeout and shows
// "Can't reach this page right now" on a page made seconds ago — and if it
// was made with no connection and never put in the outbox, it is lost.
//
// That was fixed once for the sidebar's "New page" and stayed fixed only
// there: rows, copies and teamspaces each reached the API by their own
// route and each had the bug again. This is the guard, because the next
// route will be written by someone who never saw any of it.

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..");

/** Calls the pages API's create directly, and says why that's allowed. */
const ALLOWED = new Map<string, string>([
  [
    "features/shell/offline/page-outbox-sync.tsx",
    "Sends the outbox. Every page in it was marked when it was made; this " +
      "only delivers them, and takes each one out once it lands.",
  ],
  [
    "lib/page-writes.ts",
    "Replays writes queued offline, the create among them. The page was " +
      "marked when it was made; this is the same create, sent later.",
  ],
  [
    "features/database/components/csv-import/csv-import-dialog.tsx",
    "Imports rows in bulk and opens none of them: there is no page waiting " +
      "to be shown, and marking hundreds would cost more than it saves.",
  ],
]);

/** Marks what it makes as made here, one way or another. */
const MARKERS = [
  "addLocalPage",
  "noteCreatedHere",
  "createPageMutationOptions",
  "useCreatePage",
  "useAddRow",
  "addRowMutationOptions",
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    // _unused is kept for reference, not shipped.
    if (name === "_unused" || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
    out.push(full);
  }
  return out;
}

/** Files importing createPage / createPages from the pages API. */
function createsPages(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  for (const full of sourceFiles(src)) {
    const text = readFileSync(full, "utf8");
    const path = relative(src, full).replace(/\\/g, "/");
    if (path === "api/pages.ts" || path === "lib/local-pages.ts") continue;
    const imports = /import\s*\{([^}]*)\}\s*from\s*["'][^"']*api\/pages["']/g;
    for (const match of text.matchAll(imports)) {
      if (/\bcreatePages?\b/.test(match[1])) {
        out.push({ path, text });
        break;
      }
    }
  }
  return out;
}

describe("every way a page is made", () => {
  it("finds the routes to the pages API", () => {
    // If this ever drops to nothing the scan has stopped working, and the
    // rest of this file would pass by saying nothing.
    expect(createsPages().length).toBeGreaterThan(0);
  });

  it("marks what it makes as made on this device", () => {
    const unmarked = createsPages()
      .filter(({ path }) => !ALLOWED.has(path))
      .filter(({ text }) => !MARKERS.some((marker) => text.includes(marker)))
      .map(({ path }) => path);

    expect(
      unmarked,
      `These create pages without marking them as made on this device, so ` +
        `each one opens to "Can't reach this page right now" until the ` +
        `collab server answers. Create through useCreatePage or useAddRow, ` +
        `or call noteCreatedHere(id) for a page the server has already ` +
        `taken. If the page is never opened, add it to ALLOWED with the ` +
        `reason.\n  ${unmarked.join("\n  ")}`,
    ).toEqual([]);
  });

  it("keeps a reason for each one that is allowed not to", () => {
    for (const [path, reason] of ALLOWED) {
      expect(reason.length, `${path} needs a reason`).toBeGreaterThan(40);
    }
  });

  it("has no stale entries in that list", () => {
    const paths = new Set(createsPages().map((f) => f.path));
    for (const path of ALLOWED.keys()) {
      expect(paths.has(path), `${path} no longer creates pages`).toBe(true);
    }
  });
});
