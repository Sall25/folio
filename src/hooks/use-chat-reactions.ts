import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "src/api/supabase-client";
import {
  addReaction,
  fetchRoomReactions,
  removeReaction,
  toReaction,
  type ChatReaction,
  type ReactionRow,
} from "src/api/chat-reactions";
import { useCurrentPerson } from "./use-session";

const reactionsKey = (roomId: string) => ["chat", "reactions", roomId] as const;

const same = (
  a: ChatReaction,
  b: Pick<ChatReaction, "messageId" | "personId" | "emoji">,
) =>
  a.messageId === b.messageId &&
  a.personId === b.personId &&
  a.emoji === b.emoji;

// Reactions of one room, kept live. INSERTs are filtered to the room;
// DELETE events can't be filtered server-side, but their payload carries the
// primary key (message, person, emoji), which is enough to drop the row.
export function useRoomReactions(roomId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: reactionsKey(roomId ?? ""),
    queryFn: () => fetchRoomReactions(roomId!),
    enabled: !!roomId,
  });

  useEffect(() => {
    if (!roomId) return;
    const key = reactionsKey(roomId);
    const channel = supabase
      .channel(`chat:reactions:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_reactions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const r = toReaction(payload.new as ReactionRow);
          qc.setQueryData<ChatReaction[]>(key, (old) =>
            !old || old.some((x) => same(x, r)) ? old : [...old, r],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_reactions" },
        (payload) => {
          const o = payload.old as Partial<ReactionRow>;
          if (!o.message_id || !o.person_id || !o.emoji) return;
          qc.setQueryData<ChatReaction[]>(key, (old) =>
            old?.filter(
              (x) =>
                !same(x, {
                  messageId: o.message_id!,
                  personId: o.person_id!,
                  emoji: o.emoji!,
                }),
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, qc]);

  return query;
}

// Add or remove your reaction, optimistically.
export function useToggleReaction(roomId: string | null) {
  const qc = useQueryClient();
  const { person } = useCurrentPerson();

  return useMutation({
    mutationFn: async (args: {
      messageId: string;
      emoji: string;
      on: boolean;
    }) => {
      if (!roomId || !person) throw new Error("Not ready");
      const r: ChatReaction = {
        roomId,
        messageId: args.messageId,
        personId: person.id,
        emoji: args.emoji,
      };
      if (args.on) await addReaction(r);
      else await removeReaction(r);
    },
    onMutate: async (args) => {
      if (!roomId || !person) return;
      const key = reactionsKey(roomId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ChatReaction[]>(key);
      const r: ChatReaction = {
        roomId,
        messageId: args.messageId,
        personId: person.id,
        emoji: args.emoji,
      };
      qc.setQueryData<ChatReaction[]>(key, (old = []) =>
        args.on
          ? old.some((x) => same(x, r))
            ? old
            : [...old, r]
          : old.filter((x) => !same(x, r)),
      );
      return { previous };
    },
    onError: (_e, _args, ctx) => {
      if (roomId && ctx) qc.setQueryData(reactionsKey(roomId), ctx.previous);
    },
  });
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
  personIds: string[];
}

// messageId → reactions grouped by emoji, in first-reacted order.
export function groupReactions(
  reactions: ChatReaction[],
  meId: string | undefined,
): Map<string, ReactionGroup[]> {
  const out = new Map<string, ReactionGroup[]>();
  for (const r of reactions) {
    const groups = out.get(r.messageId) ?? [];
    let g = groups.find((x) => x.emoji === r.emoji);
    if (!g) {
      g = { emoji: r.emoji, count: 0, mine: false, personIds: [] };
      groups.push(g);
    }
    g.count += 1;
    g.personIds.push(r.personId);
    if (r.personId === meId) g.mine = true;
    out.set(r.messageId, groups);
  }
  return out;
}
