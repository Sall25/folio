import type { ID } from "src/types";
import { supabase } from "./supabase-client";

// Answers to question blocks (/question in a page). The question is in the
// page's document; answers are kept by the server (migration 058), one per
// person per block.

/** A choice question's answer, or a short answer's text. */
export type QuestionAnswer = { optionId: string } | { text: string };

export interface QuestionAnswerRow {
  personId: ID;
  name: string;
  avatarUrl: string | null;
  answer: QuestionAnswer;
  updatedAt: number;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function answerQuestion(
  pageId: ID,
  blockId: string,
  answer: QuestionAnswer,
): Promise<void> {
  const { error } = await supabase.rpc("answer_question", {
    p_page_id: pageId,
    p_block_id: blockId,
    p_answer: answer,
  });
  fail(error);
}

/** Your answers on a page, by block id. */
export async function myQuestionAnswers(
  pageId: ID,
): Promise<Record<string, QuestionAnswer>> {
  const { data, error } = await supabase.rpc("my_question_answers", {
    p_page_id: pageId,
  });
  fail(error);
  return (data as Record<string, QuestionAnswer> | null) ?? {};
}

/** Everyone's answers to a block (people who can edit the page). */
export async function questionAnswersFor(
  pageId: ID,
  blockId: string,
): Promise<QuestionAnswerRow[]> {
  const { data, error } = await supabase.rpc("question_answers_for", {
    p_page_id: pageId,
    p_block_id: blockId,
  });
  fail(error);
  return (data as QuestionAnswerRow[] | null) ?? [];
}
