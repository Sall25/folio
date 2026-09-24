// Mention tokens inside chat message bodies:
//   @[person:<id>]   @[page:<id>]
// Stored by id so renamed people/pages always display their current name.

export type BodySegment =
  | { kind: "text"; text: string }
  | { kind: "person"; id: string }
  | { kind: "page"; id: string };

const TOKEN_RE = /@\[(person|page):([^\]\s]+)\]/g;

export const personToken = (id: string) => `@[person:${id}]`;
export const pageToken = (id: string) => `@[page:${id}]`;

export function parseBody(body: string): BodySegment[] {
  const out: BodySegment[] = [];
  let last = 0;
  for (const m of body.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: "text", text: body.slice(last, start) });
    out.push(
      m[1] === "person"
        ? { kind: "person", id: m[2] }
        : { kind: "page", id: m[2] },
    );
    last = start + m[0].length;
  }
  if (last < body.length) out.push({ kind: "text", text: body.slice(last) });
  return out;
}

export function mentionedPersonIds(body: string): string[] {
  const ids: string[] = [];
  for (const m of body.matchAll(TOKEN_RE)) {
    if (m[1] === "person") ids.push(m[2]);
  }
  return ids;
}

export function mentionsPerson(body: string, personId: string): boolean {
  return body.includes(personToken(personId));
}

// While composing, a picked mention shows as readable text ("@Awa Diop").
// On send, each picked mention's display text is swapped for its token —
// first occurrence per pick, so the same mention picked twice maps twice. If
// the user edited a display text away, it simply stays plain text.
export interface DraftMention {
  display: string;
  token: string;
}

export function serializeDraft(text: string, mentions: DraftMention[]): string {
  let out = text;
  for (const m of mentions) {
    const i = out.indexOf(m.display);
    if (i === -1) continue;
    out = out.slice(0, i) + m.token + out.slice(i + m.display.length);
  }
  return out;
}
