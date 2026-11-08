// Sets up scenes for screenshots, with the demo teammates from
// seed-demo.mjs (run that first):
//
//   comments  a page, "Spring workshop plan", with two comment threads
//             anchored on its text (teammates discussing a line)
//   rooms     a room, #spring-workshop, with a conversation: replies,
//             reactions, several people
//   databases a full-page database, "Workshop tracker": status, assignee,
//             due date, priority and tags, in Board, Table and Calendar views
//   collab    teammates live on a page: Awa's selection and Moussa's cursor
//             show in your editor; stays connected until Ctrl+C
//   remove    deletes the scene page, the room and the database
//
//   npm run demo:scene -- comments --email you@example.com
//   npm run demo:scene -- rooms --email you@example.com
//   npm run demo:scene -- databases --email you@example.com
//   npm run demo:scene -- collab --email you@example.com [--page <id>] [--type]
//   npm run demo:scene -- remove --email you@example.com
//
// collab opens the scene page unless --page names another one in your
// workspace; --type makes Moussa type a sentence (a real edit, it stays).
//
// Same setup as seed-demo.mjs (.env.seed.local, service role key, run on
// your machine only), plus, for collab, the collaboration server's address:
//
//   HOCUSPOCUS_URL=wss://…   (the app's VITE_HOCUSPOCUS_URL)

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

const DEMO_DOMAIN = "folio-demo.invalid";
const SCENE_PAGE_TITLE = "Spring workshop plan";
const SCENE_ROOM_NAME = "spring-workshop";
const SCENE_DB_TITLE = "Workshop tracker";

// Same palette and rule as src/lib/person-color.ts, so each teammate's
// cursor has the colour the app gives them.
const CARET_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#818cf8",
  "#e879f9",
];
function colorFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return CARET_COLORS[Math.abs(hash) % CARET_COLORS.length];
}

// ── Setup ────────────────────────────────────────────────────────────────

const [command, ...rest] = process.argv.slice(2);
const option = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const flag = (name) => rest.includes(`--${name}`);

const url = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ""
).replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = option("email");

if (
  !["comments", "rooms", "databases", "collab", "remove"].includes(command) ||
  !url ||
  !serviceKey ||
  !email
) {
  console.error(
    "Usage: npm run demo:scene -- <comments|rooms|databases|collab|remove> --email you@example.com\n" +
      "Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (and HOCUSPOCUS_URL for collab) in .env.seed.local.",
  );
  process.exit(1);
}

const client = () =>
  createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const db = client();

const now = Date.now();
const minutesAgo = (m) => now - m * 60_000;

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) {
    const why = [error.details, error.hint].filter(Boolean).join(" ");
    throw new Error(`${what}: ${error.message}${why ? `\n  ${why}` : ""}`);
  }
  return data;
}

async function context() {
  const me = await must(
    db
      .from("people")
      .select("id, name, workspace_id")
      .eq("email", email)
      .maybeSingle(),
    "finding you",
  );
  if (!me) throw new Error(`No person with the email ${email}.`);
  const people = await must(
    db
      .from("people")
      .select("id, name, email")
      .like("email", `%@${DEMO_DOMAIN}`),
    "the demo teammates",
  );
  const team = Object.fromEntries(
    people.map((p) => [p.email.split("@")[0], p]),
  );
  for (const key of ["awa", "moussa", "lea", "omar"]) {
    if (!team[key]) {
      throw new Error(
        "The demo teammates aren't there: run npm run seed:demo first.",
      );
    }
  }
  return { me, ws: me.workspace_id, team };
}

async function scenePage(ws) {
  return must(
    db
      .from("pages")
      .select("id")
      .eq("workspace_id", ws)
      .eq("title", SCENE_PAGE_TITLE)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
    "the scene page",
  );
}

// ── comments ─────────────────────────────────────────────────────────────

const text = (t) => ({ type: "text", text: t });
const paragraph = (t) => ({ type: "paragraph", content: [text(t)] });
const heading = (t) => ({
  type: "heading",
  attrs: { level: 2 },
  content: [text(t)],
});

const BLOCKS = [
  { type: "title", content: [text(SCENE_PAGE_TITLE)] },
  paragraph(
    "Everything we need for the spring workshop: the agenda, who brings what, and the open questions.",
  ),
  heading("Agenda"),
  paragraph(
    "9:00 Welcome and introductions, then a short round of expectations.",
  ),
  paragraph("9:30 Hands-on session in small groups, one mentor per group."),
  paragraph("11:00 Wrap-up: what we learned and what comes next."),
  heading("Who brings what"),
  paragraph(
    "Léa brings the projector, Omar books room B, Awa prints the handouts.",
  ),
];

// ProseMirror positions, from the page's JSON: a node with content takes
// 2 (its open and close) plus its content; text takes its length.
const nodeSize = (n) =>
  n.type === "text"
    ? n.text.length
    : 2 + (n.content ?? []).reduce((s, c) => s + nodeSize(c), 0);

/** Where `phrase` starts and ends in block `index`. */
function anchorOf(index, phrase) {
  const before = BLOCKS.slice(0, index).reduce((s, b) => s + nodeSize(b), 0);
  const blockText = BLOCKS[index].content.map((c) => c.text).join("");
  const at = blockText.indexOf(phrase);
  if (at < 0) throw new Error(`"${phrase}" isn't in block ${index}`);
  const from = before + 1 + at;
  return { from, to: from + phrase.length };
}

const THREADS = [
  {
    block: 3,
    phrase: "Welcome and introductions",
    comments: [
      [
        "lea",
        "Can we keep the intro to 15 minutes? People want to get started.",
      ],
      [
        "awa",
        "Good idea, I'll shorten it and move the round of expectations to the end.",
      ],
      ["moussa", "+1, and let's put the agenda on the first slide."],
    ],
  },
  {
    block: 4,
    phrase: "one mentor per group",
    comments: [
      ["moussa", "Do we have enough mentors for six groups?"],
      ["omar", "I asked two more people, waiting for their answers."],
    ],
  },
];

async function comments() {
  const { me, ws, team } = await context();
  let page = await scenePage(ws);
  if (!page) {
    page = { id: randomUUID() };
    await must(
      db.from("pages").insert({
        id: page.id,
        title: SCENE_PAGE_TITLE,
        content: { type: "doc", content: BLOCKS },
        cover: {
          iconName: "🗓️",
          target: "Emoji",
          coverImage: null,
          gradient: "linear-gradient(135deg, #e8d5f5 0%, #c4d8f0 100%)",
          color: null,
          positionY: null,
        },
        category: "Shared",
        general_access: "workspace",
        general_access_role: "edit",
        owner_id: me.id,
        workspace_id: ws,
        created_at: minutesAgo(90),
        updated_at: minutesAgo(5),
      }),
      "the page",
    );
    console.log(`Created the page "${SCENE_PAGE_TITLE}" (Shared).`);
  }

  const existing = await must(
    db.from("threads").select("id").eq("page_id", page.id),
    "threads",
  );
  if (existing.length > 0) {
    console.log("The page already has its comment threads.");
  } else {
    for (const [ti, th] of THREADS.entries()) {
      const threadId = randomUUID();
      await must(
        db.from("threads").insert({
          id: threadId,
          page_id: page.id,
          anchor: anchorOf(th.block, th.phrase),
          status: "open",
        }),
        "a thread",
      );
      await must(
        db.from("comments").insert(
          th.comments.map(([who, body], i) => ({
            id: randomUUID(),
            thread_id: threadId,
            person_id: team[who].id,
            body,
            created_at: minutesAgo(40 - ti * 15 - i * 4),
          })),
        ),
        "comments",
      );
    }
    console.log(`Added ${THREADS.length} comment threads.`);
  }
  console.log(`Open it: Shared → ${SCENE_PAGE_TITLE} (page id ${page.id}).`);
  console.log("If it was already open, reload it so the comments load.");
}

// ── rooms ────────────────────────────────────────────────────────────────

// [author, message, reply to (index), reactions [[who, emoji]]]
const ROOM_MESSAGES = [
  [
    "awa",
    "Draft of the workshop plan is up, it's in Shared → Spring workshop plan 🙌",
    null,
    [
      ["moussa", "🎉"],
      ["lea", "🎉"],
    ],
  ],
  ["moussa", "Nice! I left a comment on the mentors", null, []],
  [
    "omar",
    "Room B is booked for Thursday, 9:00 to 12:00",
    null,
    [["awa", "🙏"]],
  ],
  ["lea", "I'll bring the projector and the adapter", 2, [["omar", "👍"]]],
  ["awa", "Can someone print the handouts? 30 copies", null, []],
  ["you", "I'll do it tomorrow morning", 4, [["awa", "❤️"]]],
  ["moussa", "@you can you share the slides here before Thursday?", null, []],
  ["moussa", "See you all Thursday 👋", null, []],
];

async function rooms() {
  const { me, ws, team } = await context();
  let room = await must(
    db
      .from("chat_rooms")
      .select("id")
      .eq("workspace_id", ws)
      .is("teamspace_id", null)
      .eq("name", SCENE_ROOM_NAME)
      .limit(1)
      .maybeSingle(),
    "the scene room",
  );
  if (room) {
    console.log(`#${SCENE_ROOM_NAME} is already there.`);
    return;
  }
  room = await must(
    db
      .from("chat_rooms")
      .insert({
        name: SCENE_ROOM_NAME,
        kind: "room",
        visibility: "open",
        workspace_id: ws,
        created_by: me.id,
      })
      .select("id")
      .single(),
    "the room",
  );
  const authorId = (who) => (who === "you" ? me.id : team[who].id);
  // A mention of you, the way the app writes it (it also lands in your
  // inbox, through the database's mention trigger).
  const withMentions = (body) => body.replace("@you", `@[person:${me.id}]`);
  await must(
    db.from("chat_members").upsert(
      [me.id, ...Object.values(team).map((p) => p.id)].map((person_id) => ({
        room_id: room.id,
        person_id,
        role: person_id === me.id ? "owner" : "member",
        last_read_at: now,
      })),
      { onConflict: "room_id,person_id", ignoreDuplicates: true },
    ),
    "room members",
  );
  const ids = [];
  for (const [i, [who, body, replyTo, reactions]] of ROOM_MESSAGES.entries()) {
    const id = randomUUID();
    const at = minutesAgo(35 - i * 5);
    await must(
      db.from("chat_messages").insert({
        id,
        room_id: room.id,
        author_id: authorId(who),
        body: withMentions(body),
        reply_to_id: replyTo === null ? null : ids[replyTo],
        created_at: at,
      }),
      "a message",
    );
    ids.push(id);
    if (reactions.length > 0) {
      await must(
        db.from("chat_reactions").insert(
          reactions.map(([r, emoji]) => ({
            room_id: room.id,
            message_id: id,
            person_id: authorId(r),
            emoji,
            created_at: at + 60_000,
          })),
        ),
        "reactions",
      );
    }
  }
  console.log(
    `Created #${SCENE_ROOM_NAME} with ${ROOM_MESSAGES.length} messages.`,
  );
}

// ── databases ────────────────────────────────────────────────────────────

const isoDay = (days) =>
  new Date(now + days * 86_400_000).toISOString().slice(0, 10);

async function databases() {
  const { me, ws, team } = await context();
  const existing = await must(
    db
      .from("pages")
      .select("id")
      .eq("workspace_id", ws)
      .eq("title", SCENE_DB_TITLE)
      .is("deleted_at", null)
      .limit(1),
    "the scene database",
  );
  if (existing.length > 0) {
    console.log(`"${SCENE_DB_TITLE}" is already there.`);
    return;
  }

  // Columns, in the shapes the app uses (src/types: DatabaseProperty,
  // DEFAULT_CONFIGS; values: CellValueMap).
  const opt = (label, color) => ({ id: randomUUID(), label, color });
  const priority = {
    high: opt("High", "red"),
    medium: opt("Medium", "orange"),
    low: opt("Low", "gray"),
  };
  const tags = {
    logistics: opt("Logistics", "blue"),
    content: opt("Content", "purple"),
    comms: opt("Comms", "green"),
  };
  const prop = {
    name: {
      id: randomUUID(),
      name: "Name",
      config: { type: "title" },
      width: 260,
    },
    status: {
      id: randomUUID(),
      name: "Status",
      width: 150,
      config: {
        type: "status",
        groups: [
          {
            id: "todo",
            label: "To do",
            items: [
              {
                id: "not-started",
                name: "Not started",
                color: "gray",
                isDefault: true,
              },
            ],
          },
          {
            id: "in_progress",
            label: "In progress",
            items: [
              {
                id: "in-progress",
                name: "In progress",
                color: "blue",
                isDefault: false,
              },
            ],
          },
          {
            id: "done",
            label: "Done",
            items: [
              { id: "done", name: "Done", color: "green", isDefault: false },
            ],
          },
        ],
      },
    },
    assignee: {
      id: randomUUID(),
      name: "Assignee",
      width: 170,
      config: {
        type: "person",
        limit: "no-limit",
        default: "no-default",
        notifications: "users-only",
      },
    },
    due: {
      id: randomUUID(),
      name: "Due",
      width: 150,
      config: {
        type: "date",
        format: "full",
        timeFormat: "12h",
        includeTime: false,
      },
    },
    priority: {
      id: randomUUID(),
      name: "Priority",
      width: 130,
      config: { type: "select", options: Object.values(priority) },
    },
    tags: {
      id: randomUUID(),
      name: "Tags",
      width: 180,
      config: { type: "multi_select", options: Object.values(tags) },
    },
  };
  const properties = Object.values(prop);

  // [title, status, assignee, due (days from today), priority, tags]
  const ROWS = [
    ["Book room B", "done", "omar", -3, "high", ["logistics"]],
    ["Write the agenda", "done", "awa", -2, "high", ["content"]],
    ["Find two more mentors", "in-progress", "omar", 1, "high", ["logistics"]],
    ["Prepare the slides", "in-progress", "you", 2, "medium", ["content"]],
    ["Print 30 handouts", "not-started", "awa", 3, "medium", ["logistics"]],
    ["Bring the projector", "not-started", "lea", 4, "low", ["logistics"]],
    [
      "Announce it in #general",
      "not-started",
      "moussa",
      0,
      "medium",
      ["comms"],
    ],
    ["Feedback form", "not-started", "lea", 6, "low", ["comms", "content"]],
  ];
  const personOf = (who) =>
    who === "you"
      ? { id: me.id, name: me.name }
      : { id: team[who].id, name: team[who].name };

  // Views: Board by status (shown first), Table, Calendar by due date.
  const base = (name) => ({
    id: randomUUID(),
    name,
    filters: [],
    sorts: [],
    hiddenProperties: [],
  });
  const board = {
    ...base("Board"),
    type: "board",
    groupByPropertyId: prop.status.id,
    showEmptyGroups: true,
    cardPreview: "none",
    cardSize: "medium",
    coverFit: "cover",
  };
  const table = {
    ...base("Table"),
    type: "table",
    propertyOrder: [],
    frozenPropertyId: null,
  };
  const calendar = {
    ...base("Calendar"),
    type: "calendar",
    datePropertyId: prop.due.id,
  };

  const pageId = randomUUID();
  const sourceId = randomUUID();
  const access = {
    category: "Shared",
    general_access: "workspace",
    general_access_role: "edit",
  };

  await must(
    db.from("pages").insert({
      id: pageId,
      title: SCENE_DB_TITLE,
      ...access,
      settings: { width: "full", text: "normal", locked: false },
      cover: {
        iconName: "✅",
        target: "Emoji",
        coverImage: null,
        gradient: null,
        color: null,
        positionY: null,
      },
      content: {
        type: "doc",
        content: [
          { type: "title", content: [text(SCENE_DB_TITLE)] },
          {
            type: "database",
            attrs: {
              id: randomUUID(),
              sourceId,
              pageId: null,
              title: SCENE_DB_TITLE,
              views: [board, table, calendar],
              activeViewId: board.id,
            },
          },
          { type: "paragraph" },
        ],
      },
      owner_id: me.id,
      workspace_id: ws,
      created_at: minutesAgo(120),
      updated_at: minutesAgo(4),
    }),
    "the database page",
  );
  await must(
    db.from("data_sources").insert({
      id: sourceId,
      name: SCENE_DB_TITLE,
      page_id: pageId,
      properties,
      views: [],
      saved_views: [],
      row_templates: [],
      created_at: minutesAgo(120),
    }),
    "the data source",
  );
  await must(
    db.from("pages").insert(
      ROWS.map(([title, status, who, due, pri, tagKeys], i) => ({
        id: randomUUID(),
        title,
        ...access,
        parent_id: pageId,
        source_id: sourceId,
        values: {
          [prop.name.id]: title,
          [prop.status.id]: status,
          [prop.assignee.id]: [personOf(who)],
          [prop.due.id]: isoDay(due),
          [prop.priority.id]: priority[pri],
          [prop.tags.id]: tagKeys.map((k) => tags[k]),
        },
        content: {
          type: "doc",
          content: [{ type: "title", content: [text(title)] }],
        },
        owner_id: me.id,
        workspace_id: ws,
        edited_by: who === "you" ? me.id : team[who].id,
        created_at: minutesAgo(110 - i),
        updated_at: minutesAgo(60 - i * 5),
      })),
    ),
    "the rows",
  );
  console.log(
    `Created "${SCENE_DB_TITLE}" (Shared): ${ROWS.length} rows, Board, Table and Calendar views.`,
  );
}

// ── collab ───────────────────────────────────────────────────────────────

/** A teammate's access token, without their password: a sign-in link made
 *  with the service key and used right away (no email is sent). */
async function signIn(person) {
  const link = await must(
    db.auth.admin.generateLink({ type: "magiclink", email: person.email }),
    `a sign-in link for ${person.name}`,
  );
  const session = await must(
    client().auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    }),
    `signing in ${person.name}`,
  );
  return session.session.access_token;
}

/** The text of the n-th block of the page's document (0 is the title). */
function blockText(ydoc, n) {
  const block = ydoc.getXmlFragment("default").get(n);
  const t = block?.toArray().find((c) => c instanceof Y.XmlText);
  if (!t) throw new Error(`The page has no text in block ${n}.`);
  return t;
}

const rel = (ytext, index) =>
  Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(ytext, index));

function connect(hocuspocusUrl, pageId, person, token) {
  const ydoc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: hocuspocusUrl,
    name: `page:${pageId}`,
    document: ydoc,
    token,
  });
  provider.setAwarenessField("user", {
    id: person.id,
    name: person.name,
    color: colorFor(person.id),
    avatarUrl: null,
  });
  const synced = new Promise((resolve, reject) => {
    provider.on("synced", () => resolve());
    provider.on("authenticationFailed", ({ reason }) =>
      reject(new Error(`${person.name} was refused: ${reason}`)),
    );
  });
  return { ydoc, provider, synced };
}

async function collab() {
  const hocuspocusUrl =
    process.env.HOCUSPOCUS_URL || process.env.VITE_HOCUSPOCUS_URL;
  if (!hocuspocusUrl)
    throw new Error(
      "Set HOCUSPOCUS_URL in .env.seed.local (the app's VITE_HOCUSPOCUS_URL).",
    );
  const { ws, team } = await context();
  const pageId = option("page") ?? (await scenePage(ws))?.id;
  if (!pageId)
    throw new Error(
      "No page: run the comments scene first, or pass --page <id>.",
    );

  const people = [team.awa, team.moussa];
  // Edit access to the page, so the collaboration server lets them in
  // (it checks the same rules as the app).
  for (const p of people) {
    const has = await must(
      db
        .from("page_access")
        .select("id")
        .eq("page_id", pageId)
        .eq("subject_type", "person")
        .eq("subject_id", p.id)
        .limit(1),
      "page access",
    );
    if (has.length === 0) {
      await must(
        db.from("page_access").insert({
          page_id: pageId,
          subject_type: "person",
          subject_id: p.id,
          role: "edit",
        }),
        `access for ${p.name}`,
      );
    }
  }
  const tokens = await Promise.all(people.map(signIn));
  const [awa, moussa] = people.map((p, i) =>
    connect(hocuspocusUrl, pageId, p, tokens[i]),
  );
  await Promise.all([awa.synced, moussa.synced]);

  // The scene page's blocks (see BLOCKS); another page: the first lines.
  const scene = option("page") === undefined;
  const awaText = blockText(awa.ydoc, scene ? 5 : 1);
  const moussaText = blockText(
    moussa.ydoc,
    scene ? 7 : Math.min(2, awa.ydoc.getXmlFragment("default").length - 1),
  );

  // Awa has a few words selected; Moussa's cursor sits at the end of a line.
  const words = scene ? "what we learned" : awaText.toString().slice(0, 20);
  const start = Math.max(0, awaText.toString().indexOf(words));
  awa.provider.setAwarenessField("cursor", {
    anchor: rel(awaText, start),
    head: rel(awaText, start + words.length),
  });
  const end = moussaText.length;
  moussa.provider.setAwarenessField("cursor", {
    anchor: rel(moussaText, end),
    head: rel(moussaText, end),
  });

  if (flag("type")) {
    const sentence = " Moussa brings the coffee.";
    for (const ch of sentence) {
      moussaText.insert(moussaText.length, ch);
      const at = moussaText.length;
      moussa.provider.setAwarenessField("cursor", {
        anchor: rel(moussaText, at),
        head: rel(moussaText, at),
      });
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  console.log(
    `Awa and Moussa are on the page ${pageId}. Open it in the app and take your screenshots.`,
  );
  console.log("Ctrl+C when you're done.");
  process.on("SIGINT", () => {
    awa.provider.destroy();
    moussa.provider.destroy();
    process.exit(0);
  });
  await new Promise(() => {}); // stay connected
}

// ── remove ───────────────────────────────────────────────────────────────

async function remove() {
  const { ws } = await context();
  const page = await scenePage(ws);
  if (page) {
    // Its threads and comments go with it (they cascade).
    await must(db.from("pages").delete().eq("id", page.id), "the page");
    console.log(`Deleted "${SCENE_PAGE_TITLE}".`);
  }
  const deleted = await must(
    db
      .from("chat_rooms")
      .delete()
      .eq("workspace_id", ws)
      .is("teamspace_id", null)
      .eq("name", SCENE_ROOM_NAME)
      .select("id"),
    "the room",
  );
  if (deleted.length > 0) console.log(`Deleted #${SCENE_ROOM_NAME}.`);
  // The database: its data source (the rows go with it), then its page.
  const dbPages = await must(
    db
      .from("pages")
      .select("id")
      .eq("workspace_id", ws)
      .eq("title", SCENE_DB_TITLE)
      .is("source_id", null),
    "the scene database",
  );
  for (const p of dbPages) {
    await must(
      db.from("data_sources").delete().eq("page_id", p.id),
      "the data source",
    );
    await must(db.from("pages").delete().eq("id", p.id), "the database page");
    console.log(`Deleted "${SCENE_DB_TITLE}".`);
  }
  if (!page && deleted.length === 0 && dbPages.length === 0)
    console.log("No scene to remove.");
}

({ comments, rooms, databases, collab, remove })[command]().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
