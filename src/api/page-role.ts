import type { ID, PageRole } from "src/types";
import { supabase } from "./supabase-client";

// Ask the server for the current user's effective role on a page. Uses the
// existing page_effective_role(p_id, person) SECURITY DEFINER function, so the
// client never re-implements (and can't drift from) the permission logic.
export async function fetchPageRole(pageId: ID): Promise<PageRole | null> {
  const { data, error } = await supabase.rpc("page_effective_role", {
    p_id: pageId,
    person: (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  if (error) throw error;
  return (data as PageRole | null) ?? null;
}
