import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { passMousemove } from "src/lib/pass-mousemove";
import { QuestionView } from "./question-view";

// A question inside a page (/question): multiple choice or a short answer.
// The question is kept here, in the document; answers are kept by the server,
// one per person (api/question-answers.ts, migration 058).

export interface QuestionOption {
  id: string;
  label: string;
}

export interface QuestionAttrs {
  /** Stable id: answers are filed under it. */
  blockId: string;
  kind: "choice" | "text";
  prompt: string;
  options: QuestionOption[];
  /** The right choice, or null (no right answer: a poll). */
  correct: string | null;
  /** Shown after answering. */
  explanation: string;
}

const newId = () =>
  crypto.randomUUID?.() ?? `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const questionDefaults = (): QuestionAttrs => ({
  blockId: newId(),
  kind: "choice",
  prompt: "",
  options: [
    { id: newId(), label: "" },
    { id: newId(), label: "" },
  ],
  correct: null,
  explanation: "",
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    question: {
      insertQuestion: (attrs?: Partial<QuestionAttrs>) => ReturnType;
    };
  }
}

const jsonAttr = <T,>(name: string, fallback: () => T) => ({
  default: fallback(),
  parseHTML: (el: HTMLElement) => {
    const raw = el.getAttribute(`data-${name}`);
    if (raw == null) return fallback();
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback();
    }
  },
  renderHTML: (attrs: Record<string, unknown>) => ({
    [`data-${name}`]: JSON.stringify(attrs[name]),
  }),
});

export const QuestionExtension = Node.create({
  name: "question",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: jsonAttr("blockid", () => ""),
      kind: jsonAttr<QuestionAttrs["kind"]>("kind", () => "choice"),
      prompt: jsonAttr("prompt", () => ""),
      options: jsonAttr<QuestionOption[]>("options", () => []),
      correct: jsonAttr<string | null>("correct", () => null),
      explanation: jsonAttr("explanation", () => ""),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="question"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "question" })];
  },

  addNodeView() {
    return passMousemove(ReactNodeViewRenderer(QuestionView));
  },

  addCommands() {
    return {
      insertQuestion:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { ...questionDefaults(), ...attrs },
          }),
    };
  },
});
