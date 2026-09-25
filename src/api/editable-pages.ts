import { supabase } from "./supabase-client";

export async function fetchEditablePageIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc("my_editable_page_ids");
  if (error) throw new Error(error.message);
  return (data ?? []) as string[];
}
