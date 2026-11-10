import { describe, expect, it } from "vitest";
import type { DatabaseProperty, FormQuestion } from "src/types";
import {
  isEmptyAnswer,
  isFormOpen,
  isQuestionShown,
  missingAnswers,
  shownAnswers,
} from "./form-logic";

const online: DatabaseProperty = {
  id: "online",
  name: "En ligne ?",
  config: {
    type: "select",
    options: [
      { id: "yes", label: "Oui", color: "green" },
      { id: "no", label: "Non", color: "red" },
    ],
  },
} as DatabaseProperty;
const link: DatabaseProperty = {
  id: "link",
  name: "Lien",
  config: { type: "url" },
} as DatabaseProperty;
const agree: DatabaseProperty = {
  id: "agree",
  name: "J'accepte",
  config: { type: "checkbox" },
} as DatabaseProperty;

const questions: FormQuestion[] = [
  { propertyId: "online" },
  {
    propertyId: "link",
    required: true,
    showIf: { propertyId: "online", values: ["yes"] },
  },
  { propertyId: "agree", required: true },
];
const properties = [online, link, agree];

describe("form logic", () => {
  it("shows a question only when its trigger has a matching answer", () => {
    expect(isQuestionShown(questions[1], questions, {})).toBe(false);
    expect(
      isQuestionShown(questions[1], questions, {
        online: { id: "yes", label: "Oui", color: "green" },
      }),
    ).toBe(true);
    expect(
      isQuestionShown(questions[1], questions, {
        online: { id: "no", label: "Non", color: "red" },
      }),
    ).toBe(false);
  });

  it("never follows a trigger placed after the question", () => {
    const flipped = [questions[1], questions[0]];
    expect(
      isQuestionShown(flipped[0], flipped, {
        online: { id: "yes", label: "Oui", color: "green" },
      }),
    ).toBe(false);
  });

  it("requires only the questions that show; a required box must be ticked", () => {
    expect(missingAnswers(questions, properties, {})).toEqual(["agree"]);
    expect(
      missingAnswers(questions, properties, {
        online: { id: "yes", label: "Oui", color: "green" },
        agree: true,
      }),
    ).toEqual(["link"]);
    expect(isEmptyAnswer(false, "checkbox")).toBe(true);
    expect(isEmptyAnswer(0, "number")).toBe(false);
  });

  it("sends only the answers that show", () => {
    expect(
      shownAnswers(questions, {
        online: { id: "no", label: "Non", color: "red" },
        link: "https://old",
        agree: true,
      }),
    ).toEqual({ online: { id: "no", label: "Non", color: "red" }, agree: true });
  });

  it("is closed by hand or past its time", () => {
    expect(isFormOpen({})).toBe(true);
    expect(isFormOpen({ closed: true })).toBe(false);
    expect(isFormOpen({ closesAt: Date.now() - 1000 })).toBe(false);
    expect(isFormOpen({ closesAt: Date.now() + 60_000 })).toBe(true);
  });
});
