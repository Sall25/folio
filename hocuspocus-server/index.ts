/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { Server } from "@hocuspocus/server";
import { SQLite } from "@hocuspocus/extension-sqlite";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { jwtVerify, createRemoteJWKSet } from "jose";
import * as Y from "yjs";
import { seedExtensions } from "./seed-schema";
import {
  dedupeOwnDatabases,
  restoreOwnDatabases,
} from "./dedupe-databases";

// Guarantee the doc has a title as its first child. The client used to insert
// this; now the server owns it, so every page is seeded with a title present.
function ensureTitle(content: any) {
  // No content at all → a minimal doc: title + empty paragraph.
  if (!content || !content.content || content.content.length === 0) {
    return {
      type: "doc",
      content: [
        { type: "title", content: [] },
        { type: "paragraph", content: [] },
      ],
    };
  }
  // Has content but the first node isn't a title → prepend an empty title.
  if (content.content[0]?.type !== "title") {
    return {
      ...content,
      content: [{ type: "title", content: [] }, ...content.content],
    };
  }
  // Already has a title first → leave as-is.
  return content;
}

// A doc is "meaningful" if it has a doc node with at least one child that
// carries content beyond an empty title/paragraph skeleton. This is the LAST
// line of defense against writing an empty doc over real Supabase content.
function isMeaningfulContent(content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  const doc = content as { type?: string; content?: unknown[] };
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return false;
  // At least one node that isn't an empty title and isn't an empty paragraph.
  return doc.content.some((node) => {
    const n = node as { type?: string; content?: unknown[] };
    const isEmpty = !n.content || n.content.length === 0;
    if ((n.type === "title" || n.type === "paragraph") && isEmpty) return false;
    return true;
  });
}

// Separate Node process from the Vite app — run with `npx tsx index.ts` from
// THIS folder (so dotenv finds ./.env). Needs its own env vars:
//   SUPABASE_URL=https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<service_role secret — the long eyJ... JWT>
//   PORT=1234                    (optional)

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL env var.");
}

const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var.");
}

const REST = `${SUPABASE_URL}/rest/v1`;

// Verify session tokens LOCALLY against Supabase's published PUBLIC keys
// (JWKS). Tokens are signed ES256; the server only needs the public half. jose
// fetches the JWKS once and caches it, so this is not a per-connection network
// call in the normal case.
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

// ── Supabase REST helper (service role — bypasses RLS) ───────────────────────
// The server reads pages/teamspaces/membership to DECIDE access, so it must see
// rows regardless of the connecting user's RLS. Service-role key: server-only,
// never shipped to the client, never logged.
async function sb<T>(pathAndQuery: string): Promise<T | null> {
  const res = await fetch(`${REST}${pathAndQuery}`, {
    headers: {
      apikey: SERVICE_ROLE!,
      Authorization: `Bearer ${SERVICE_ROLE!}`,
    },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

interface PageRecord {
  id: string;
  content?: unknown;
}

/** The page's row, waiting a little for one being inserted right now. */
async function loadPageRecord(
  pageId: string,
  tries = 6,
  waitMs = 400,
): Promise<PageRecord | null> {
  for (let i = 0; i < tries; i++) {
    const rows = await sb<PageRecord[]>(
      `/pages?id=eq.${encodeURIComponent(pageId)}&select=id,content`,
    );
    if (rows?.[0]) return rows[0];
    if (i < tries - 1) await new Promise((r) => setTimeout(r, waitMs));
  }
  return null;
}

// ── Durable Yjs state ────────────────────────────────────────────────────────
// pages.content (JSON) keeps the TEXT but not the Yjs identity of each piece
// of it. Re-seeding from JSON after SQLite is wiped creates the same text
// with brand-new ids, and any client still holding the old doc (an open tab,
// or an offline copy with unsent edits) merges BOTH → duplicated content.
// So the binary Yjs state is stored too, in its own table (public.page_ydocs,
// service-role only — kept off `pages` so the app's `select *` never downloads
// it), and a wiped server reloads the exact same doc. JSON stays for search,
// previews and first-time seeding.

interface YdocRecord {
  state: string | null; // bytea, returned by PostgREST as "\x<hex>"
}

function bytesFromBytea(value: string | null | undefined): Uint8Array | null {
  if (!value || !value.startsWith("\\x")) return null;
  const hex = value.slice(2);
  if (hex.length === 0) return null;
  return new Uint8Array(Buffer.from(hex, "hex"));
}

const byteaFromBytes = (bytes: Uint8Array) =>
  `\\x${Buffer.from(bytes).toString("hex")}`;

async function loadYdocState(pageId: string): Promise<Uint8Array | null> {
  const rows = await sb<YdocRecord[]>(
    `/page_ydocs?page_id=eq.${encodeURIComponent(pageId)}&select=state`,
  );
  return bytesFromBytea(rows?.[0]?.state);
}

async function storeYdocState(
  pageId: string,
  state: Uint8Array,
): Promise<void> {
  const res = await fetch(`${REST}/page_ydocs?on_conflict=page_id`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE!,
      Authorization: `Bearer ${SERVICE_ROLE!}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      page_id: pageId,
      state: byteaFromBytes(state),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`page_ydocs upsert ${res.status}: ${body}`);
  }
}

type CollabAccess = "edit" | "view";

interface AuthContext {
  personId: string;
  access: CollabAccess;
}

const server = new Server<AuthContext>({
  port: Number(process.env.PORT ?? 1234),

  extensions: [
    new SQLite({
      database: "folio-hocuspocus.sqlite",
    }),
  ],

  // Hydrate a document the server doesn't hold, before any client edits it.
  // Race-free: by the time the client's Collaboration extension and TitleNode
  // see it, it's already correct. Order:
  //   1. SQLite had it (this container's copy) → nothing to do.
  //   2. The durable Yjs state in Supabase → load it, SAME ids as the copies
  //      clients hold, so reconnecting tabs / offline edits merge cleanly.
  //   3. Neither (a page never opened since this shipped) → seed from JSON
  //      once; onStoreDocument then saves its Yjs state for next time.
  async onLoadDocument({ documentName, document }) {
    // Not empty → the doc already has real content (from SQLite/prior edits).
    if (!document.isEmpty("default")) return;

    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    try {
      const state = await loadYdocState(pageId);
      if (state) {
        Y.applyUpdate(document, state);
        if (!document.isEmpty("default")) return;
      }
    } catch (err) {
      // Fall back to JSON rather than leaving the page blank.
      console.error(
        `[onLoadDocument] ydoc load failed for ${documentName}:`,
        err,
      );
    }

    // A page made on this device is opened the moment it's made, often
    // before its row reaches the database. Seeding then gave the page an
    // empty skeleton, which was stored and never seeded again: its blocks
    // (a database's own block) only turned up later, through the repair
    // below. So the row is waited for briefly, and when it still isn't
    // there the document is left empty for the next load to seed.
    const page = await loadPageRecord(pageId);
    if (!page) {
      console.warn(
        `[onLoadDocument] no page row for ${documentName} yet; leaving it empty to seed later`,
      );
      return;
    }

    let content = (page.content as any) ?? null;
    content = ensureTitle(content); // ← guarantee a title first-child

    try {
      const seededYdoc = TiptapTransformer.toYdoc(
        content,
        "default",
        seedExtensions as any,
      );
      document.merge(seededYdoc);
    } catch (err) {
      console.error(`[onLoadDocument] seed failed for ${documentName}:`, err);
    }
  },

  // A database's own page carries its block exactly once: take out copies
  // left by two first versions merging, and put back one a client's first
  // version replaced (dedupe-databases.ts). Runs after every load, whichever
  // way the doc came in; both changes sync to clients as ordinary edits.
  async afterLoadDocument({ documentName, document }) {
    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;
    try {
      const sources = await sb<{ id: string }[]>(
        `/data_sources?page_id=eq.${encodeURIComponent(pageId)}&select=id`,
      );
      const own = new Set((sources ?? []).map((s) => s.id));
      const removed = dedupeOwnDatabases(document, own);
      if (removed > 0) {
        console.warn(
          `[afterLoadDocument] removed ${removed} duplicate database block(s) from ${documentName}`,
        );
      }

      // And put back one the page lost before the client stopped writing
      // its own first version over the page's content.
      if (own.size > 0) {
        const rows = await sb<PageRecord[]>(
          `/pages?id=eq.${encodeURIComponent(pageId)}&select=id,content`,
        );
        const added = restoreOwnDatabases(document, own, rows?.[0]?.content);
        if (added > 0) {
          console.warn(
            `[afterLoadDocument] restored ${added} missing database block(s) in ${documentName}`,
          );
        }
      }
    } catch (err) {
      console.error(`[afterLoadDocument] dedupe failed for ${documentName}:`, err);
    }
  },

  // Hocuspocus v3: the per-connection settings are `connectionConfig`
  // (v2 called this `connection`).
  async onAuthenticate({ token, documentName, connectionConfig }) {
    if (!token) {
      throw new Error("Not authenticated.");
    }

    // Verify the Supabase session token locally (ES256 signature + exp).
    let personId: string;
    try {
      const { payload } = await jwtVerify(token, JWKS);
      if (!payload.sub) {
        throw new Error("Token has no subject.");
      }
      // `sub` is the Supabase auth user id === people.id.
      personId = payload.sub;
    } catch (err) {
      console.error("[onAuthenticate] JWT verify failed:", err);
      throw new Error("Not authenticated.");
    }

    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    // The DB decides the access LEVEL with the same rules as page RLS:
    // owner / teamspace member / edit role → 'edit'; view or comment role,
    // public view → 'view'; otherwise null (no access).
    const access = await sb<string | null>(
      `/rpc/collab_page_access?p_id=${encodeURIComponent(
        pageId,
      )}&person=${encodeURIComponent(personId)}`,
    );

    if (access !== "edit" && access !== "view") {
      throw new Error("Not authorized for this page.");
    }

    // Below edit: the connection still receives live updates and awareness
    // (cursors), but the server ignores document changes it sends.
    if (access === "view") {
      connectionConfig.readOnly = true;
    }

    // Available in later hooks via context.
    return { personId, access };
  },

  // Persist the live document content back to Supabase. This is the DURABLE
  // save: the Yjs doc lives in Hocuspocus's SQLite, but that SQLite is
  // ephemeral (wiped on every redeploy/restart). Writing content here makes
  // Supabase the source of truth again, so a lost SQLite re-seeds from CURRENT
  // content (via onLoadDocument) instead of stale creation-time content.
  async onStoreDocument({ documentName, document }) {
    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    // Convert the live Yjs doc → JSON, using the SAME schema the seed uses.
    let content: unknown;
    try {
      content = TiptapTransformer.fromYdoc(document, "default");
    } catch (err) {
      console.error(
        `[onStoreDocument] fromYdoc failed for ${documentName}:`,
        err,
      );
      return; // don't write garbage — keep the last good Supabase content
    }

    // Guard: never persist an empty/skeleton doc over real content.
    if (!isMeaningfulContent(content)) {
      console.warn(
        `[onStoreDocument] refusing to write empty content for ${documentName}`,
      );
      return;
    }

    // The durable Yjs state (same guard as the JSON: an empty doc — e.g. a
    // failed seed — must never replace a real one). Independent of the JSON
    // write below: either failing doesn't block the other.
    try {
      await storeYdocState(pageId, Y.encodeStateAsUpdate(document));
    } catch (err) {
      console.error(
        `[onStoreDocument] ydoc store failed for ${documentName}:`,
        err,
      );
    }

    try {
      const res = await fetch(
        `${REST}/pages?id=eq.${encodeURIComponent(pageId)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SERVICE_ROLE!,
            Authorization: `Bearer ${SERVICE_ROLE!}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            content,
            updated_at: Date.now(),
          }),
        },
      );

      // fetch does NOT throw on 4xx/5xx — check res.ok so failures aren't
      // silently treated as success.
      if (!res.ok) {
        const body = await res.text();
        console.error(
          `[onStoreDocument] PATCH ${res.status} ${res.statusText} for ${documentName}: ${body}`,
        );
        return;
      }

      console.log(
        `[onStoreDocument] PATCH ${res.status} OK for ${documentName}`,
      );
    } catch (err) {
      // Only network-level throws reach here (DNS, connection refused, etc).
      console.error(`[onStoreDocument] PATCH threw for ${documentName}:`, err);
    }
  },
});

server.listen();
