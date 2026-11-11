import { useEffect, useMemo, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "src/components/icons";
import {
  answerQuestion,
  myQuestionAnswers,
  questionAnswersFor,
  type QuestionAnswer,
} from "src/api/question-answers";
import { useEditorPageId } from "src/features/editor/context/editor-page-context";
import type { QuestionAttrs, QuestionOption } from "./question-node";
import "./question-node.scss";

const newId = () =>
  crypto.randomUUID?.() ?? `o_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// Fields inside the block: the page editor mustn't take their keys.
const stop = (e: React.SyntheticEvent) => e.stopPropagation();
const keepKeys = { onKeyDownCapture: stop, onMouseDown: stop };

/** The question block: built by people who can edit the page (with a
 *  preview to try it and everyone's answers), answered by the others. */
export function QuestionView({ node, updateAttributes, editor }: NodeViewProps) {
  const { t } = useTranslation();
  const a = node.attrs as QuestionAttrs;
  const pageId = useEditorPageId();
  const editable = editor.isEditable;
  const [trying, setTrying] = useState(false);

  // A block pasted in without an id gets one.
  useEffect(() => {
    if (editable && !a.blockId)
      updateAttributes({ blockId: newId() });
  }, [editable, a.blockId, updateAttributes]);

  const answering = !editable || trying;

  return (
    <NodeViewWrapper className="question-block" data-kind={a.kind} contentEditable={false}>
      {editable && (
        <div className="question-block__mode" role="group">
          <button
            type="button"
            data-on={!trying || undefined}
            onClick={() => setTrying(false)}
          >
            {t("question.edit")}
          </button>
          <button
            type="button"
            data-on={trying || undefined}
            onClick={() => setTrying(true)}
          >
            {t("question.tryIt")}
          </button>
        </div>
      )}
      {answering ? (
        <QuestionAnswering a={a} pageId={pageId} />
      ) : (
        <QuestionBuilder a={a} update={updateAttributes} />
      )}
      {editable && pageId && a.blockId && <QuestionResults a={a} pageId={pageId} />}
    </NodeViewWrapper>
  );
}

function QuestionBuilder({
  a,
  update,
}: {
  a: QuestionAttrs;
  update: (attrs: Partial<QuestionAttrs>) => void;
}) {
  const { t } = useTranslation();
  const setOption = (id: string, label: string) =>
    update({ options: a.options.map((o) => (o.id === id ? { ...o, label } : o)) });

  return (
    <div className="question-block__builder">
      <div className="question-block__kinds" role="radiogroup">
        <label>
          <input
            type="radio"
            checked={a.kind === "choice"}
            onChange={() => update({ kind: "choice" })}
          />
          {t("question.choice")}
        </label>
        <label>
          <input
            type="radio"
            checked={a.kind === "text"}
            onChange={() => update({ kind: "text" })}
          />
          {t("question.shortAnswer")}
        </label>
      </div>

      <textarea
        className="question-block__prompt-input"
        rows={1}
        value={a.prompt}
        placeholder={t("question.promptPlaceholder")}
        aria-label={t("question.prompt")}
        {...keepKeys}
        onChange={(e) => update({ prompt: e.target.value })}
      />

      {a.kind === "choice" && (
        <div className="question-block__options">
          {a.options.map((o, i) => (
            <div key={o.id} className="question-block__option-edit">
              <button
                type="button"
                className="question-block__correct"
                data-on={a.correct === o.id || undefined}
                aria-pressed={a.correct === o.id}
                aria-label={t("question.markCorrect")}
                title={t("question.markCorrect")}
                onClick={() => update({ correct: a.correct === o.id ? null : o.id })}
              >
                <Check size={14} />
              </button>
              <input
                className="question-block__option-input"
                value={o.label}
                placeholder={t("question.optionPlaceholder", { n: i + 1 })}
                aria-label={t("question.optionPlaceholder", { n: i + 1 })}
                {...keepKeys}
                onChange={(e) => setOption(o.id, e.target.value)}
              />
              <button
                type="button"
                className="question-block__icon"
                aria-label={t("question.removeOption")}
                title={t("question.removeOption")}
                disabled={a.options.length <= 1}
                onClick={() =>
                  update({
                    options: a.options.filter((x) => x.id !== o.id),
                    correct: a.correct === o.id ? null : a.correct,
                  })
                }
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="question-block__add"
            onClick={() =>
              update({ options: [...a.options, { id: newId(), label: "" }] })
            }
          >
            <Plus size={14} aria-hidden />
            {t("question.addOption")}
          </button>
          <span className="question-block__hint">
            {a.correct ? t("question.hasCorrect") : t("question.noCorrect")}
          </span>
        </div>
      )}

      <input
        className="question-block__explanation-input"
        value={a.explanation}
        placeholder={t("question.explanationPlaceholder")}
        aria-label={t("question.explanation")}
        {...keepKeys}
        onChange={(e) => update({ explanation: e.target.value })}
      />
    </div>
  );
}

function QuestionAnswering({
  a,
  pageId,
}: {
  a: QuestionAttrs;
  pageId: string | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const key = ["question-answers", pageId];
  const mine = useQuery({
    queryKey: key,
    queryFn: () => myQuestionAnswers(pageId!),
    enabled: !!pageId,
    staleTime: 30_000,
  });
  const saved = a.blockId ? mine.data?.[a.blockId] : undefined;
  const [draft, setDraft] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: (answer: QuestionAnswer) =>
      answerQuestion(pageId!, a.blockId, answer),
    onMutate: (answer) => {
      qc.setQueryData<Record<string, QuestionAnswer>>(key, (prev) => ({
        ...(prev ?? {}),
        [a.blockId]: answer,
      }));
    },
    onSuccess: () => {
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["question-stats", pageId, a.blockId] });
    },
    onError: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const canAnswer = !!pageId && !!a.blockId;
  const picked = saved && "optionId" in saved ? saved.optionId : null;
  const savedText = saved && "text" in saved ? saved.text : null;
  const text = draft ?? savedText ?? "";

  return (
    <div className="question-block__answer">
      <div className="question-block__prompt">
        {a.prompt || <span className="question-block__muted">{t("question.untitled")}</span>}
      </div>

      {a.kind === "choice" ? (
        <div className="question-block__choices" role="radiogroup">
          {a.options
            .filter((o) => o.label.trim())
            .map((o) => {
              const chosen = picked === o.id;
              const verdict =
                picked && a.correct
                  ? o.id === a.correct
                    ? "right"
                    : chosen
                      ? "wrong"
                      : undefined
                  : undefined;
              return (
                <label
                  key={o.id}
                  className="question-block__choice"
                  data-chosen={chosen || undefined}
                  data-verdict={verdict}
                >
                  <input
                    type="radio"
                    name={`q-${a.blockId}`}
                    checked={chosen}
                    disabled={!canAnswer || send.isPending}
                    onChange={() => send.mutate({ optionId: o.id })}
                  />
                  <span>{o.label}</span>
                  {verdict === "right" && (
                    <span className="question-block__verdict">
                      {chosen ? t("question.correct") : t("question.rightAnswer")}
                    </span>
                  )}
                  {verdict === "wrong" && (
                    <span className="question-block__verdict">
                      {t("question.notQuite")}
                    </span>
                  )}
                </label>
              );
            })}
        </div>
      ) : (
        <div className="question-block__text">
          <textarea
            className="question-block__text-input"
            rows={2}
            value={text}
            placeholder={t("question.yourAnswer")}
            aria-label={t("question.yourAnswer")}
            disabled={!canAnswer}
            {...keepKeys}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="question-block__row">
            <button
              type="button"
              className="question-block__send"
              disabled={
                !canAnswer || send.isPending || !text.trim() || text === savedText
              }
              onClick={() => send.mutate({ text: text.trim() })}
            >
              {savedText && text === savedText
                ? t("question.sent")
                : t("question.send")}
            </button>
          </div>
        </div>
      )}

      {saved && a.explanation.trim() && (
        <div className="question-block__explanation">{a.explanation}</div>
      )}
      {send.isError && (
        <div className="question-block__error" role="alert">
          {send.error instanceof Error ? send.error.message : t("question.failed")}
        </div>
      )}
    </div>
  );
}

function QuestionResults({ a, pageId }: { a: QuestionAttrs; pageId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rows = useQuery({
    queryKey: ["question-stats", pageId, a.blockId],
    queryFn: () => questionAnswersFor(pageId, a.blockId),
    staleTime: 15_000,
    refetchInterval: open ? 15_000 : false,
  });
  const list = useMemo(() => rows.data ?? [], [rows.data]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of list)
      if ("optionId" in r.answer) m.set(r.answer.optionId, (m.get(r.answer.optionId) ?? 0) + 1);
    return m;
  }, [list]);
  const right =
    a.kind === "choice" && a.correct ? (counts.get(a.correct) ?? 0) : null;

  return (
    <div className="question-block__results">
      <button
        type="button"
        className="question-block__results-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {t("question.answers", { count: list.length })}
        {right !== null && list.length > 0 && (
          <> · {t("question.rightCount", { count: right })}</>
        )}
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open && a.kind === "choice" && (
        <div className="question-block__bars">
          {a.options
            .filter((o: QuestionOption) => o.label.trim())
            .map((o) => {
              const n = counts.get(o.id) ?? 0;
              const pct = list.length ? Math.round((n / list.length) * 100) : 0;
              return (
                <div key={o.id} className="question-block__bar">
                  <div className="question-block__bar-label">
                    <span>
                      {o.label}
                      {a.correct === o.id && (
                        <Check size={12} aria-label={t("question.rightAnswer")} />
                      )}
                    </span>
                    <span>{n}</span>
                  </div>
                  <div className="question-block__bar-track">
                    <div
                      className="question-block__bar-fill"
                      data-right={a.correct === o.id || undefined}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}
      {open && a.kind === "text" && (
        <ul className="question-block__texts">
          {list.length === 0 && (
            <li className="question-block__muted">{t("question.noAnswers")}</li>
          )}
          {list.map((r) => (
            <li key={r.personId}>
              <strong>{r.name}</strong>
              <span>{"text" in r.answer ? r.answer.text : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
