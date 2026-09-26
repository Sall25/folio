import { supabase } from "./supabase-client";
import type { ChatMessage } from "src/types";
import { toMessage, type MessageRow } from "./chat";

// A block shared into a chat message. pageId/blockId/snapshot are null when
// the viewer can't read the page — render a locked card.
export interface BlockRef {
  messageId: string;
  pageId: string | null;
  blockId: string | null;
  snapshot: string | null;
}

export interface SharedBlock {
  pageId: string;
  blockId: string;
  snapshot: string;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function fetchRoomBlockRefs(
  roomId: string,
): Promise<Map<string, BlockRef>> {
  const { data, error } = await supabase.rpc("room_block_refs", {
    p_room: roomId,
  });
  fail(error);
  const out = new Map<string, BlockRef>();
  for (const r of (data ?? []) as {
    message_id: string;
    page_id: string | null;
    block_id: string | null;
    snapshot: string | null;
  }[]) {
    out.set(r.message_id, {
      messageId: r.message_id,
      pageId: r.page_id,
      blockId: r.block_id,
      snapshot: r.snapshot,
    });
  }
  return out;
}

export async function sendBlockMessage(args: {
  id: string;
  roomId: string;
  body: string;
  replyToId: string | null;
  block: SharedBlock;
}): Promise<ChatMessage> {
  const { data, error } = await supabase.rpc("send_block_message", {
    p_id: args.id,
    p_room: args.roomId,
    p_body: args.body,
    p_reply_to: args.replyToId,
    p_page: args.block.pageId,
    p_block: args.block.blockId,
    p_snapshot: args.block.snapshot,
  });
  fail(error);
  return toMessage((data as { message: MessageRow }).message);
}
