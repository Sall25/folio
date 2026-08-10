import "dotenv/config";
import { Server } from "@hocuspocus/server";
import { SQLite } from "@hocuspocus/extension-sqlite";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { seedExtensions } from "./seed-schema";

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

interface AuthContext {
  personId: string;
}

const server = new Server<AuthContext>({
  port: Number(process.env.PORT ?? 1234),

  extensions: [
    new SQLite({
      database: "folio-hocuspocus.sqlite",
    }),
  ],

  // Seed a brand-new document ONCE, before any client edits it. Race-free: the
  // doc is hydrated from stored content here, so by the time the client's
  // Collaboration extension and TitleNode see it, it's already correct.
  async onLoadDocument({ documentName, document }) {
    console.log(
      "[onLoadDocument]",
      documentName,
      "isEmpty:",
      document.isEmpty("default"),
    );
    if (!document.isEmpty("default")) return;

    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    // PostgREST returns an array; unwrap the single row.
    const rows = await sb<PageRecord[]>(
      `/pages?id=eq.${encodeURIComponent(pageId)}&select=id,content`,
    );
    const page = rows?.[0] ?? null;
    if (!page || !page.content) return; // nothing to seed → stays empty

    try {
      const seededYdoc = TiptapTransformer.toYdoc(
        page.content,
        "default",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seedExtensions as any,
      );
      document.merge(seededYdoc);
    } catch (err) {
      console.error(`[onLoadDocument] seed failed for ${documentName}:`, err);
    }
  },

  async onAuthenticate({ token, documentName }) {
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
      // `sub` is the Supabase auth user id === people.id (per the migration).
      personId = payload.sub;
    } catch (err) {
      console.error("[onAuthenticate] JWT verify failed:", err);
      throw new Error("Not authenticated.");
    }

    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    // The DB decides access: can_person_access_page walks parent_id to the
    // teamspace and checks effective membership, returning a single boolean.
    // Not under a teamspace → the RPC returns true (v1 private-page gap,
    // documented in the migration).
    const ok = await sb<boolean>(
      `/rpc/can_person_access_page?p_id=${encodeURIComponent(
        pageId,
      )}&person=${encodeURIComponent(personId)}`,
    );

    if (ok !== true) {
      throw new Error("Not authorized for this page.");
    }

    // Available in later hooks via context.personId.
    return { personId };
  },

  // Page.content stops being the source of truth once a page is collaborative.
  // But the sidebar's "recently edited" sort still reads Page.updatedAt, so
  // that one field keeps getting bumped here — nothing else on the row.
  async onStoreDocument({ documentName }) {
    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    await fetch(`${REST}/pages?id=eq.${encodeURIComponent(pageId)}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE!,
        Authorization: `Bearer ${SERVICE_ROLE!}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
    }).catch(() => {
      // Best-effort — a missed updatedAt bump isn't worth crashing over.
    });
  },
});

server.listen();
