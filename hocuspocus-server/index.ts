import "dotenv/config";
import { Server } from "@hocuspocus/server";
import { SQLite } from "@hocuspocus/extension-sqlite";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { seedExtensions } from "./seed-schema";

// This is a SEPARATE Node process from your Vite app — run it with
// `npx tsx server/index.ts` (or compile with tsc) alongside `npm run dev`.
// Needs its own env vars (see bottom of file for a minimal .env).

// Where your json-server instance is running — teamspaces/pages/groups
// still live there per the current split (only `people`/auth moved to
// Supabase so far).
const JSON_SERVER_URL = process.env.JSON_SERVER_URL ?? "http://localhost:3001";

// Your Supabase project URL, e.g. https://<project-ref>.supabase.co
const SUPABASE_URL = process.env.SUPABASE_URL!;
if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL env var.");
}

// Verify session tokens LOCALLY against Supabase's published PUBLIC keys
// (JWKS). The project signs tokens with an asymmetric ES256 key, so the
// server only needs the public half — it can verify but never sign. No
// per-connection network round-trip to Supabase (jose fetches the JWKS once
// and caches it, only re-fetching when it sees an unknown key id), which is
// what cut the page-switch delay. No sensitive secret in .env.
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

// ── Minimal shapes needed here — kept local rather than importing your
// full types.ts, since this is a separate Node process/package. If this
// ends up in the same monorepo with a shared tsconfig, swap these for the
// real `Page`/`Teamspace`/`Group` imports instead of duplicating.
interface PageRecord {
  id: string;
  teamspaceId?: string | null;
  // Stored ProseMirror JSON — the source for the one-time Yjs seed.
  content?: unknown;
}
interface TeamspaceRecord {
  id: string;
  memberIds: string[];
  groupIds: string[];
}
interface GroupRecord {
  id: string;
  memberIds: string[];
}

function effectiveMemberIds(
  ts: TeamspaceRecord,
  groups: GroupRecord[],
): string[] {
  const set = new Set<string>(ts.memberIds);
  const byId = new Map(groups.map((g) => [g.id, g]));
  for (const gid of ts.groupIds) {
    const g = byId.get(gid);
    if (g) for (const pid of g.memberIds) set.add(pid);
  }
  return [...set];
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${JSON_SERVER_URL}${path}`);
  if (!res.ok) return null;
  return res.json() as Promise<T>;
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

  // Seed a brand-new document ONCE, before any client edits it. This is the
  // documented, race-free place to do it: the doc is hydrated from stored
  // content here, so by the time the client's Collaboration extension and
  // TitleNode see it, it's already correct — no transitional empty state to
  // trigger duplicate-title / empty-paragraph insertion.
  async onLoadDocument({ documentName, document }) {
    // Already has content (seeded before, or has real edits) — never touch.
    if (!document.isEmpty("default")) return;

    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    const page = await fetchJson<PageRecord>(`/pages/${pageId}`);
    if (!page || !page.content) return; // nothing to seed → stays empty

    try {
      const seededYdoc = TiptapTransformer.toYdoc(
        page.content,
        "default",
        // seedExtensions is a minimal structural schema — see seed-schema.ts.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seedExtensions as any,
      );
      document.merge(seededYdoc);
    } catch (err) {
      console.error(`[onLoadDocument] seed failed for ${documentName}:`, err);
      // Leave the doc empty rather than crash the load — better a blank page
      // than a dead connection. Surfaces loudly in logs for investigation.
    }
  },

  async onAuthenticate({ token, documentName }) {
    if (!token) {
      throw new Error("Not authenticated.");
    }

    // Verify the Supabase session token LOCALLY against the project's public
    // keys (JWKS). Checks the ES256 signature and exp; throws if invalid or
    // expired. jose caches the JWKS, so this is not a per-connection network
    // call in the normal case.
    let personId: string;
    try {
      const { payload } = await jwtVerify(token, JWKS);
      // `sub` is the Supabase auth user id === people.id (per the migration).
      if (!payload.sub) {
        throw new Error("Token has no subject.");
      }
      personId = payload.sub;
    } catch (err) {
      console.error("[onAuthenticate] JWT verify failed:", err);
      throw new Error("Not authenticated.");
    }

    // documentName convention: `page:${page.id}`
    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    const page = await fetchJson<PageRecord>(`/pages/${pageId}`);
    if (!page) {
      throw new Error("Page not found.");
    }

    // No teamspace on this page — no ownership model exists yet for
    // private pages, so allow any authenticated person through for now.
    // Known gap, not a decision to leave silent.
    if (!page.teamspaceId) {
      return { personId };
    }

    const teamspace = await fetchJson<TeamspaceRecord>(
      `/teamspaces/${page.teamspaceId}`,
    );
    if (!teamspace) {
      throw new Error("Teamspace not found.");
    }

    const groups = (await fetchJson<GroupRecord[]>("/groups")) ?? [];
    const memberIds = effectiveMemberIds(teamspace, groups);

    if (!memberIds.includes(personId)) {
      throw new Error("Not a member of this teamspace.");
    }

    // Available in other hooks (onChange, onStoreDocument, etc.) via
    // `context.personId` — e.g. to attribute changes or log activity.
    return { personId };
  },

  // Page.content stops being the source of truth once a page is
  // collaborative (clean cutover, not kept in sync). But things like the
  // sidebar's "recently edited" sort still depend on Page.updatedAt, so
  // that one field keeps getting bumped here — everything else about the
  // page record is untouched.
  async onStoreDocument({ documentName }) {
    const pageId = documentName.startsWith("page:")
      ? documentName.slice("page:".length)
      : documentName;

    await fetch(`${JSON_SERVER_URL}/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updatedAt: Date.now() }),
    }).catch(() => {
      // Best-effort — a missed updatedAt bump isn't worth crashing the
      // store hook over. Worth logging properly once you have real
      // observability, not just swallowing silently forever.
    });
  },
});

server.listen();
