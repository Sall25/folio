// Fills a workspace with demo teammates, for screenshots (the landing page,
// docs) that need other people in them: members in the workspace and its
// teamspaces, a conversation in the rooms, replies on your open comment
// threads, and a few notifications for you.
//
// Runs on your machine only, with the service role key: it never goes into
// the app. Put the key in a file git ignores (*.local), e.g. .env.seed.local:
//
//   SUPABASE_URL=https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<service role key>
//
// Then (PowerShell or any shell):
//
//   npm run seed:demo -- --email you@example.com
//   npm run seed:demo -- --email you@example.com --remove
//
// (npm run seed:demo is node --env-file=.env.seed.local scripts/seed-demo.mjs)
//
// --email   whose current workspace to fill, and who gets the notifications
// --remove  deletes the demo teammates and everything they wrote
//
// The demo teammates are real accounts (they need to be, for the app to
// show them) with addresses at folio-demo.invalid and random passwords:
// nobody can sign in as them. Running it twice doesn't add them twice.

import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";

const DEMO_DOMAIN = "folio-demo.invalid";

const TEAMMATES = [
  { key: "awa", name: "Awa Diallo" },
  { key: "moussa", name: "Moussa Ndiaye" },
  { key: "lea", name: "Léa Martin" },
  { key: "omar", name: "Omar Sy" },
];

// A conversation for each room, oldest first: [teammate key, message].
// "you" is the person given with --email.
const CONVERSATION = [
  ["awa", "Morning everyone 👋 the draft of the workshop plan is up"],
  ["moussa", "Nice! I left two comments on the agenda"],
  ["lea", "Can we keep the intro to 15 minutes?"],
  ["awa", "Good idea, I'll shorten it"],
  ["omar", "I booked room B for Thursday 9:00"],
  ["moussa", "Perfect. Who's bringing the projector?"],
  ["lea", "I can 🙋‍♀️"],
];

const REPLIES = [
  ["moussa", "Agreed, let's do that."],
  ["lea", "Done, I updated the section below."],
  ["awa", "Looks good to me 👍"],
];

// ── Setup ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = option("email");

if (!url || !serviceKey || !email) {
  console.error(
    "Usage: node --env-file=.env.seed.local scripts/seed-demo.mjs --email you@example.com [--remove]\n" +
      "Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const now = Date.now();
const minutesAgo = (m) => now - m * 60_000;

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) {
    // "fetch failed" hides why: the details say (wrong address, no DNS,
    // refused, timed out…).
    const why = [error.details, error.hint].filter(Boolean).join(" ");
    throw new Error(`${what}: ${error.message}${why ? `\n  ${why}` : ""}`);
  }
  return data;
}

/** Can Node reach Supabase at all? Says why not before anything else. */
async function checkConnection() {
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/health`, {
      headers: { apikey: serviceKey },
    });
    if (!res.ok) {
      throw new Error(`Supabase answered ${res.status} at ${url}`);
    }
  } catch (e) {
    const cause = e.cause
      ? ` (${e.cause.code ?? ""} ${e.cause.message ?? e.cause})`
      : "";
    throw new Error(
      `Can't reach Supabase at "${url}": ${e.message}${cause}\n` +
        "Check SUPABASE_URL in .env.seed.local: https://<project>.supabase.co, " +
        "nothing after it, no spaces.",
    );
  }
}

const demoEmail = (key) => `${key}@${DEMO_DOMAIN}`;

/** The demo accounts that exist, by teammate key. */
async function existingDemoUsers() {
  const found = new Map();
  for (let page = 1; ; page++) {
    const { users } = await must(
      db.auth.admin.listUsers({ page, perPage: 200 }),
      "listing users",
    );
    for (const u of users) {
      if (u.email?.endsWith(`@${DEMO_DOMAIN}`)) {
        found.set(u.email.split("@")[0], u.id);
      }
    }
    if (users.length < 200) return found;
  }
}

// ── Remove ───────────────────────────────────────────────────────────────

async function remove() {
  const ids = [...(await existingDemoUsers()).values()];
  if (ids.length === 0) {
    console.log("No demo teammates to remove.");
    return;
  }
  await must(
    db.from("chat_messages").delete().in("author_id", ids),
    "messages",
  );
  await must(
    db.from("chat_members").delete().in("person_id", ids),
    "room members",
  );
  await must(db.from("comments").delete().in("person_id", ids), "comments");
  await must(
    db.from("notifications").delete().in("actor_id", ids),
    "notifications",
  );
  await must(
    db.from("workspace_members").delete().in("person_id", ids),
    "workspace members",
  );
  const teamspaces = await must(
    db.from("teamspaces").select("id, member_ids").overlaps("member_ids", ids),
    "teamspaces",
  );
  for (const ts of teamspaces) {
    await must(
      db
        .from("teamspaces")
        .update({ member_ids: ts.member_ids.filter((m) => !ids.includes(m)) })
        .eq("id", ts.id),
      "teamspace members",
    );
  }
  // The workspace each one got at sign-up (deleting it takes their person
  // with it), anything left of the person, then the account.
  await must(
    db.from("workspaces").delete().in("owner_id", ids),
    "their workspaces",
  );
  await must(db.from("people").delete().in("id", ids), "people");
  for (const id of ids) {
    await must(db.auth.admin.deleteUser(id), "deleting an account");
  }
  console.log(`Removed ${ids.length} demo teammates and what they wrote.`);
}

// ── Seed ─────────────────────────────────────────────────────────────────

async function seed() {
  const me = await must(
    db
      .from("people")
      .select("id, name, workspace_id")
      .eq("email", email)
      .maybeSingle(),
    "finding you",
  );
  if (!me) throw new Error(`No person with the email ${email}.`);
  const ws = me.workspace_id;
  console.log(`Filling the workspace ${ws} (current workspace of ${me.name}).`);

  // 1. The teammates: accounts (the sign-up trigger creates their person),
  //    then members of your workspace.
  const existing = await existingDemoUsers();
  const ids = {};
  for (const t of TEAMMATES) {
    let id = existing.get(t.key);
    if (!id) {
      const { user } = await must(
        db.auth.admin.createUser({
          email: demoEmail(t.key),
          password: randomBytes(24).toString("base64url"),
          email_confirm: true,
          user_metadata: { name: t.name },
        }),
        `creating ${t.name}`,
      );
      id = user.id;
    }
    ids[t.key] = id;
    await must(
      db
        .from("workspace_members")
        .upsert(
          { workspace_id: ws, person_id: id, role: "member", created_at: now },
          { onConflict: "workspace_id,person_id", ignoreDuplicates: true },
        ),
      "workspace member",
    );
  }
  const allIds = Object.values(ids);
  // Your workspace as their current one: page access ("Everyone in the
  // workspace", the collaboration server's check) goes by people.workspace_id.
  await must(
    db.from("people").update({ workspace_id: ws }).in("id", allIds),
    "their current workspace",
  );
  console.log(`Teammates: ${TEAMMATES.map((t) => t.name).join(", ")}.`);

  // 2. Members of every teamspace in the workspace.
  const teamspaces = await must(
    db.from("teamspaces").select("id, member_ids").eq("workspace_id", ws),
    "teamspaces",
  );
  for (const ts of teamspaces) {
    const members = [...new Set([...(ts.member_ids ?? []), ...allIds])];
    await must(
      db.from("teamspaces").update({ member_ids: members }).eq("id", ts.id),
      "teamspace members",
    );
  }
  console.log(`Added to ${teamspaces.length} teamspace(s).`);

  // 3. A conversation in each room of the workspace and its teamspaces
  //    (not DMs), skipped where they already talked.
  const rooms = await must(
    db
      .from("chat_rooms")
      .select("id, name")
      .eq("workspace_id", ws)
      .neq("kind", "dm"),
    "rooms",
  );
  for (const room of rooms) {
    await must(
      db.from("chat_members").upsert(
        allIds.map((person_id) => ({
          room_id: room.id,
          person_id,
          role: "member",
          last_read_at: now,
        })),
        { onConflict: "room_id,person_id", ignoreDuplicates: true },
      ),
      "room members",
    );
    const already = await must(
      db
        .from("chat_messages")
        .select("id", { count: "exact", head: false })
        .eq("room_id", room.id)
        .in("author_id", allIds)
        .limit(1),
      "messages",
    );
    if (already.length > 0) continue;
    await must(
      db.from("chat_messages").insert(
        CONVERSATION.map(([who, body], i) => ({
          room_id: room.id,
          author_id: ids[who],
          body,
          created_at: minutesAgo(40 - i * 5),
        })),
      ),
      "messages",
    );
  }
  console.log(`A conversation in ${rooms.length} room(s).`);

  // 4. Replies on your open comment threads, in the workspace's pages.
  const myComments = await must(
    db.from("comments").select("thread_id").eq("person_id", me.id),
    "your comments",
  );
  const threadIds = [...new Set(myComments.map((c) => c.thread_id))];
  let replied = 0;
  if (threadIds.length > 0) {
    const threads = await must(
      db
        .from("threads")
        .select("id, page_id, pages!inner(workspace_id)")
        .in("id", threadIds)
        .eq("status", "open")
        .eq("pages.workspace_id", ws),
      "threads",
    );
    for (const [i, th] of threads.slice(0, 10).entries()) {
      const [who, body] = REPLIES[i % REPLIES.length];
      const exists = await must(
        db
          .from("comments")
          .select("id")
          .eq("thread_id", th.id)
          .eq("person_id", ids[who])
          .limit(1),
        "replies",
      );
      if (exists.length > 0) continue;
      await must(
        db.from("comments").insert({
          id: randomUUID(),
          thread_id: th.id,
          person_id: ids[who],
          body,
          created_at: minutesAgo(10 - i),
        }),
        "a reply",
      );
      replied++;
    }
  }
  console.log(`Replied on ${replied} open thread(s) of yours.`);

  // 5. A few notifications for you: a mention on a page and in a room.
  const page = await must(
    db
      .from("pages")
      .select("id, title")
      .eq("workspace_id", ws)
      .is("deleted_at", null)
      .is("source_id", null)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    "a page",
  );
  const notifications = [];
  if (page) {
    notifications.push({
      id: randomUUID(),
      recipient_id: me.id,
      actor_id: ids.awa,
      type: "user-mention",
      title: "Awa Diallo mentioned you",
      message: "Can you review this section before Thursday?",
      source_page_id: page.id,
      source_page_title: page.title,
      dedup_key: `demo-mention-${page.id}`,
      created_at: minutesAgo(8),
    });
  }
  if (rooms[0]) {
    notifications.push({
      id: randomUUID(),
      recipient_id: me.id,
      actor_id: ids.moussa,
      type: "chat-mention",
      title: `Moussa Ndiaye mentioned you in #${rooms[0].name ?? "general"}`,
      message: "Can you share the slides here?",
      source_room_id: rooms[0].id,
      dedup_key: `demo-chat-${rooms[0].id}`,
      created_at: minutesAgo(3),
    });
  }
  for (const n of notifications) {
    const dup = await must(
      db
        .from("notifications")
        .select("id")
        .eq("recipient_id", me.id)
        .eq("dedup_key", n.dedup_key)
        .limit(1),
      "notifications",
    );
    if (dup.length === 0)
      await must(db.from("notifications").insert(n), "a notification");
  }
  console.log(`${notifications.length} notification(s) for you.`);
  console.log("Done. Reload the app to see them.");
}

checkConnection()
  .then(() => (flag("remove") ? remove() : seed()))
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
