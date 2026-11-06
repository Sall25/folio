import { supabase } from "./supabase-client";

/**
 * @all in a page: the server notifies everyone who can open the page
 * (054_page_mention_all.sql). Safe to call again for the same chip: each
 * person gets one notification per chip.
 */
export async function notifyPageMentionAll(input: {
  pageId: string;
  nodeId: string;
  message: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("notify_page_mention_all", {
    p_page_id: input.pageId,
    p_node_id: input.nodeId,
    p_message: input.message,
  });
  if (error) throw error;
  return (data as number | null) ?? 0;
}
