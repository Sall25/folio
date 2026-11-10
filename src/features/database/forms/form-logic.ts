import type {
  DatabaseProperty,
  FormQuestion,
  ID,
  PropertyType,
  SelectOption,
} from "src/types";

// A form's rules, shared by the builder and the fill page. The server
// (submit_form_response, migration 056) applies the same ones; these are
// for showing them.

/** Property types a form can ask. Person, relation and computed types
 *  can't be answered (a person property set to "Me" records who answered). */
export const ANSWERABLE_TYPES: PropertyType[] = [
  "title",
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "checkbox",
  "date",
  "url",
  "email",
  "phone",
  "files",
];

export const isAnswerable = (type: PropertyType) =>
  ANSWERABLE_TYPES.includes(type);

/** Types a "show only if" can follow: those with a fixed set of answers. */
export const isTriggerType = (type: PropertyType) =>
  type === "select" ||
  type === "multi_select" ||
  type === "status" ||
  type === "checkbox";

/** The answers a trigger question can have, for "show only if". */
export function triggerChoices(
  property: DatabaseProperty,
  t: (key: string) => string,
): { value: string; label: string }[] {
  const config = property.config;
  switch (config.type) {
    case "select":
    case "multi_select":
      return config.options.map((o) => ({ value: o.id, label: o.label }));
    case "status":
      return config.groups
        .flatMap((g) => g.items)
        .map((i) => ({ value: i.id, label: i.name }));
    case "checkbox":
      return [
        { value: "true", label: t("database.form.checked") },
        { value: "false", label: t("database.form.unchecked") },
      ];
    default:
      return [];
  }
}

/** Whether an answer counts as given (a required checkbox must be ticked). */
export function isEmptyAnswer(value: unknown, type: PropertyType): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (type === "checkbox") return value === false;
  return false;
}

/** Whether an answer is one of a "show only if"'s values. */
export function answerMatches(value: unknown, values: string[]): boolean {
  if (value == null) return false;
  if (Array.isArray(value))
    return value.some((v) => values.includes((v as SelectOption)?.id));
  if (typeof value === "object")
    return values.includes((value as SelectOption).id);
  return values.includes(String(value));
}

/** Whether a question shows, given the answers so far. Its trigger must
 *  come before it in the form, and be shown itself. */
export function isQuestionShown(
  question: FormQuestion,
  questions: FormQuestion[],
  answers: Record<ID, unknown>,
): boolean {
  const rule = question.showIf;
  if (!rule) return true;
  const at = questions.indexOf(question);
  const triggerAt = questions.findIndex(
    (q) => q.propertyId === rule.propertyId,
  );
  if (triggerAt < 0 || triggerAt >= at) return false;
  if (!isQuestionShown(questions[triggerAt], questions, answers)) return false;
  return answerMatches(answers[rule.propertyId], rule.values);
}

/** The questions left unanswered among the required ones that show. */
export function missingAnswers(
  questions: FormQuestion[],
  properties: DatabaseProperty[],
  answers: Record<ID, unknown>,
): ID[] {
  const byId = new Map(properties.map((p) => [p.id, p]));
  return questions
    .filter((q) => q.required && isQuestionShown(q, questions, answers))
    .filter((q) => {
      const p = byId.get(q.propertyId);
      return !!p && isEmptyAnswer(answers[q.propertyId], p.config.type);
    })
    .map((q) => q.propertyId);
}

/** The answers to send: only questions that show. */
export function shownAnswers(
  questions: FormQuestion[],
  answers: Record<ID, unknown>,
): Record<ID, unknown> {
  const out: Record<ID, unknown> = {};
  for (const q of questions) {
    if (!isQuestionShown(q, questions, answers)) continue;
    if (q.propertyId in answers) out[q.propertyId] = answers[q.propertyId];
  }
  return out;
}

/** Whether the form takes answers now. */
export function isFormOpen(view: {
  closed?: boolean;
  closesAt?: number | null;
}): boolean {
  if (view.closed) return false;
  return !(view.closesAt != null && view.closesAt <= Date.now());
}
