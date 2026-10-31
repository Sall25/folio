import type { GeneralAccess, ID, PageRole } from "src/types";
import { supabase } from "./supabase-client";

/** Set who can open a page, for it and every page inside it (migration
 *  051). Needs full access to the page. Resolves with how many pages
 *  changed. */
export async function setPageGeneralAccessTree(
  pageId: ID,
  access: GeneralAccess,
  role: PageRole,
): Promise<number> {
  const { data, error } = await supabase.rpc("set_page_general_access_tree", {
    p_id: pageId,
    p_access: access,
    p_role: role,
  });
  if (error) throw error;
  return (data as number | null) ?? 0;
}
