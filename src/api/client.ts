import { supabase } from "./supabase-client";

// ── Supabase SDK as a drop-in for the json-server REST shape ─────────────────
//
// Routes the ten api/*.ts files through the configured `supabase` client
// (supabase.from(...)) rather than raw fetch. The SDK owns the apikey +
// Authorization headers, so there is no hand-set key to get wrong — the whole
// "Invalid API key" class of failure disappears.
//
// The api files speak a json-server dialect this shim maps onto PostgREST:
//   GET    /pages                     → from('pages').select()
//   GET    /pages/:id                 → .select().eq('id', :id).single()
//   GET    /comments?threadId=x       → .select().eq('thread_id', x)
//   POST   /pages        {body}       → .insert(body).select().single()
//   PATCH  /pages/:id    {body}       → .update(body).eq('id', :id).select().single()
//   DELETE /pages/:id                 → .delete().eq('id', :id)
//
// camelCase (app) ⇄ snake_case (DB) mapping is applied on the way in and out.
// jsonb blobs are passed through untouched.

// app path segment → table name
const TABLE: Record<string, string> = {
  pages: "pages",
  people: "people",
  groups: "groups",
  teamspaces: "teamspaces",
  workspaces: "workspaces",
  pageAccess: "page_access",
  comments: "comments",
  threads: "threads",
  versions: "versions",
  dataSources: "data_sources",
  workspaceSettings: "workspace_settings",
  notifications: "notifications",
};

// query-param key (camelCase) → column (snake_case)
const COLUMN: Record<string, string> = {
  threadId: "thread_id",
  pageId: "page_id",
};

// jsonb columns — passed through without key-casing their internals.
const JSONB_PASSTHROUGH = new Set([
  "content",
  "cover",
  "values",
  "settings",
  "anchor",
  "data",
  "inviteLink",
  "invite_link",
  "properties",
  "views",
  "savedViews",
  "rowTemplates",
]);

const toSnake = (s: string) =>
  s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s: string) =>
  s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function keysToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(keysToSnake);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[toSnake(k)] = JSONB_PASSTHROUGH.has(k) ? v : keysToSnake(v);
    }
    return out;
  }
  return obj;
}

function keysToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[toCamel(k)] = JSONB_PASSTHROUGH.has(k) ? v : keysToCamel(v);
    }
    return out;
  }
  return obj;
}

interface Parsed {
  table: string;
  id: string | null;
  filters: [string, string][];
}

function parse(path: string): Parsed {
  const [rawPath, rawQuery] = path.replace(/^\//, "").split("?");
  const segments = rawPath.split("/");
  const table = TABLE[segments[0]] ?? segments[0];
  const id = segments[1] ? decodeURIComponent(segments[1]) : null;

  const filters: [string, string][] = [];
  if (rawQuery) {
    for (const pair of rawQuery.split("&")) {
      const [k, v] = pair.split("=");
      if (!k) continue;
      const col = COLUMN[k] ?? toSnake(k);
      filters.push([col, decodeURIComponent(v ?? "")]);
    }
  }
  return { table, id, filters };
}

// ── the shim — same signature as the old http<T> ─────────────────────────────

export const http = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const method = (init?.method ?? "GET").toUpperCase();
  const { table, id, filters } = parse(path);

  const body = init?.body
    ? (keysToSnake(JSON.parse(init.body as string)) as Record<string, unknown>)
    : undefined;

  // ── GET ────────────────────────────────────────────────────────────────
  if (method === "GET") {
    let q = supabase.from(table).select("*");
    if (id) q = q.eq("id", id);
    for (const [col, val] of filters) q = q.eq(col, val);

    // /pages/:id is a single-resource path → one object, else an array.
    if (id) {
      const { data, error } = await q.single();
      if (error && error.code !== "PGRST116")
        throw asError(method, path, error);
      return (data ? keysToCamel(data) : null) as T;
    }
    const { data, error } = await q;
    if (error) throw asError(method, path, error);
    return keysToCamel(data ?? []) as T;
  }

  // ── POST ───────────────────────────────────────────────────────────────
  if (method === "POST") {
    const { data, error } = await supabase
      .from(table)
      .insert(body ?? {})
      .select()
      .single();
    if (error) throw asError(method, path, error);
    return keysToCamel(data) as T;
  }

  // ── PATCH ──────────────────────────────────────────────────────────────
  if (method === "PATCH") {
    let q = supabase.from(table).update(body ?? {});
    if (id) q = q.eq("id", id);
    for (const [col, val] of filters) q = q.eq(col, val);
    const { data, error } = await q.select().single();
    if (error) throw asError(method, path, error);
    return keysToCamel(data) as T;
  }

  // ── DELETE ─────────────────────────────────────────────────────────────
  if (method === "DELETE") {
    let q = supabase.from(table).delete();
    if (id) q = q.eq("id", id);
    for (const [col, val] of filters) q = q.eq(col, val);
    const { error } = await q;
    if (error) throw asError(method, path, error);
    return undefined as T;
  }

  throw new Error(`Unsupported method ${method} for ${path}`);
};

function asError(
  method: string,
  path: string,
  error: { message: string; code?: string },
): Error {
  return new Error(
    `Error ${method} ${path}: ${error.message} (${error.code ?? "?"})`,
  );
}
