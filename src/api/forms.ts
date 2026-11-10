import type { JSONContent } from "@tiptap/core";
import type { DatabaseProperty, FormQuestion, ID } from "src/types";
import { supabase } from "./supabase-client";
import { appUrl } from "src/lib/app-url";

// Forms: reading one to fill it in, and answering it. Both go through the
// server (migration 056): it checks who can answer, whether the form is open
// and one answer per person, and creates the answer's row, private to the
// person who answered and the database's owner.

/** What the fill page needs (get_form). */
export interface FormPayload {
  databaseTitle: string;
  databasePageId: ID;
  workspaceId: ID;
  view: {
    id: ID;
    formTitle?: string | null;
    formDescription?: JSONContent | string | null;
    questions: FormQuestion[];
    closesAt?: number | null;
    onePerPerson: boolean;
  };
  /** The questions' properties, in the form's order. */
  properties: DatabaseProperty[];
  closed: boolean;
  canAnswer: boolean;
  /** Can edit the database: sees the form even outside its audience. */
  canEdit: boolean;
  answered: boolean;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** The form, or null when it doesn't exist or isn't yours to see. */
export async function getForm(
  sourceId: ID,
  viewId: ID,
): Promise<FormPayload | null> {
  const { data, error } = await supabase.rpc("get_form", {
    p_source_id: sourceId,
    p_view_id: viewId,
  });
  fail(error);
  return (data as FormPayload | null) ?? null;
}

/** Answers the form; returns the new row's id. */
export async function submitFormResponse(
  sourceId: ID,
  viewId: ID,
  values: Record<ID, unknown>,
): Promise<ID> {
  const { data, error } = await supabase.rpc("submit_form_response", {
    p_source_id: sourceId,
    p_view_id: viewId,
    p_values: values,
  });
  fail(error);
  return data as ID;
}

/** The form's address, to share. */
export const formPath = (sourceId: ID, viewId: ID) =>
  `/form/${sourceId}/${viewId}`;

export const formUrl = (sourceId: ID, viewId: ID) =>
  appUrl(formPath(sourceId, viewId));
