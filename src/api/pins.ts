import type { ID } from "src/types";
import { supabase } from "./supabase-client";

// Pins across pages (migration 048). Row security returns only the pins you
// may see: yours, your teamspaces', and only for pages you can read.

export type PinScope = "mine" | "teamspace";

export interface Pin {
  id: string;
  personId: string;
  pageId: ID;
  blockId: string;
  scope: PinScope;
  teamspaceId: ID | null;
  position: number;
}

interface PinRow {
  id: string;
  person_id: string;
  page_id: string;
  block_id: string;
  scope: PinScope;
  teamspace_id: string | null;
  position: number;
}

const toPin = (r: PinRow): Pin => ({
  id: r.id,
  personId: r.person_id,
  pageId: r.page_id,
  blockId: r.block_id,
  scope: r.scope,
  teamspaceId: r.teamspace_id,
  position: r.position,
});

export async function fetchPins(): Promise<Pin[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("id, person_id, page_id, block_id, scope, teamspace_id, position")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as PinRow[]).map(toPin);
}

export async function createPin(pin: {
  pageId: ID;
  blockId: string;
  scope: PinScope;
  teamspaceId?: ID | null;
}): Promise<Pin> {
  const { data, error } = await supabase
    .from("pins")
    .insert({
      page_id: pin.pageId,
      block_id: pin.blockId,
      scope: pin.scope,
      teamspace_id: pin.teamspaceId ?? null,
    })
    .select("id, person_id, page_id, block_id, scope, teamspace_id, position")
    .single();
  if (error) throw error;
  return toPin(data as PinRow);
}

export async function deletePin(id: string): Promise<void> {
  const { error } = await supabase.from("pins").delete().eq("id", id);
  if (error) throw error;
}
