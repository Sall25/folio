import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-location";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ID } from "src/types";
import { getForm, submitFormResponse } from "src/api/forms";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { FormQuestionInput } from "./form-question-input";
import { FormDescription } from "./form-description";
import { hasDescription } from "./form-description-doc";
import { isQuestionShown, missingAnswers, shownAnswers } from "./form-logic";
import "./form.scss";

/** The source and view ids in /form/<sourceId>/<viewId>. */
function idsFromPath(pathname: string): { sourceId: ID; viewId: ID } | null {
  const m = pathname.match(/\/form\/([^/]+)\/([^/?#]+)/);
  return m
    ? { sourceId: decodeURIComponent(m[1]), viewId: decodeURIComponent(m[2]) }
    : null;
}

// /form/<sourceId>/<viewId>: a form to fill in. The server decides whether
// you can answer it (get_form); your answer becomes a row only you and the
// database's owner can see (submit_form_response).
export function FormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const ids = idsFromPath(location.current.pathname);

  const form = useQuery({
    queryKey: ["form", ids?.sourceId, ids?.viewId],
    queryFn: () => getForm(ids!.sourceId, ids!.viewId),
    enabled: !!ids,
    staleTime: 0,
  });

  const [answers, setAnswers] = useState<Record<ID, unknown>>({});
  const [missing, setMissing] = useState<ID[]>([]);
  const [rowId, setRowId] = useState<ID | null>(null);

  const data = form.data;
  const questions = useMemo(() => data?.view.questions ?? [], [data]);
  const properties = useMemo(() => data?.properties ?? [], [data]);
  const byId = useMemo(
    () => new Map(properties.map((p) => [p.id, p])),
    [properties],
  );

  const submit = useMutation({
    mutationFn: () =>
      submitFormResponse(
        ids!.sourceId,
        ids!.viewId,
        shownAnswers(questions, answers),
      ),
    onSuccess: (id) => setRowId(id),
  });

  const setAnswer = (propertyId: ID, value: unknown) => {
    setAnswers((a) => ({ ...a, [propertyId]: value }));
    setMissing((m) => m.filter((id) => id !== propertyId));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gaps = missingAnswers(questions, properties, answers);
    setMissing(gaps);
    if (gaps.length) {
      document
        .getElementById(`form-q-${gaps[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    submit.mutate();
  };

  const state = (title: string, text?: string) => (
    <div className="form-page">
      <div className="form-page__column">
        <div className="form-page__card form-page__state">
          <h1 className="form-page__title">{title}</h1>
          {text && <p className="form-page__description">{text}</p>}
          <div className="form-page__actions">
            {rowId && (
              <Button
                variant="primary"
                onClick={() => navigate({ to: `/page/${rowId}` })}
              >
                {t("database.form.seeAnswer")}
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
              {t("database.form.backHome")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!ids) return state(t("database.form.notFound"));
  if (form.isLoading) return <div className="form-page" aria-busy="true" />;
  if (form.isError)
    return state(t("database.form.loadFailed"), String(form.error));
  if (!data) return state(t("database.form.notFound"), t("database.form.notFoundHint"));
  if (rowId)
    return state(t("database.form.thanks"), t("database.form.thanksHint"));

  const preview = !data.canAnswer && data.canEdit;
  if (data.closed && !preview)
    return state(t("database.form.closedTitle"), t("database.form.closedHint"));
  if (data.answered && data.view.onePerPerson && !preview)
    return state(t("database.form.answeredTitle"), t("database.form.answeredHint"));

  const title = data.view.formTitle || data.databaseTitle;

  return (
    <div className="form-page">
      <form className="form-page__column" onSubmit={onSubmit} noValidate>
        <button
          type="button"
          className="form-page__back"
          onClick={() => window.history.back()}
        >
          ← {t("database.form.back")}
        </button>
        <div className="form-page__card form-page__head">
          {data.view.closesAt != null && (
            <span className="form-page__eyebrow">
              {t("database.form.closesOn", {
                date: new Date(data.view.closesAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </span>
          )}
          <h1 className="form-page__title">{title}</h1>
          {hasDescription(data.view.formDescription) && (
            <div className="form-page__rich">
              <FormDescription value={data.view.formDescription} />
            </div>
          )}
        </div>

        {preview && (
          <div className="form-page__notice">
            {t("database.form.previewNotice")}
          </div>
        )}

        {questions.map((q) => {
          const property = byId.get(q.propertyId);
          if (!property) return null;
          if (!isQuestionShown(q, questions, answers)) return null;
          const inputId = `form-q-${q.propertyId}`;
          const isMissing = missing.includes(q.propertyId);
          return (
            <div
              key={q.propertyId}
              className="form-page__card"
              data-missing={isMissing || undefined}
            >
              <label className="form-page__label" htmlFor={inputId}>
                {q.label || property.name}
                {q.required && (
                  <span className="form-page__required" aria-hidden>
                    *
                  </span>
                )}
              </label>
              {q.description && (
                <p className="form-page__help">{q.description}</p>
              )}
              <FormQuestionInput
                property={property}
                value={answers[q.propertyId]}
                onChange={(v) => setAnswer(q.propertyId, v)}
                inputId={inputId}
              />
              {isMissing && (
                <span className="form-page__error" role="alert">
                  {t("database.form.missing")}
                </span>
              )}
            </div>
          );
        })}

        {submit.isError && (
          <div className="form-page__error" role="alert">
            {submit.error instanceof Error
              ? submit.error.message
              : t("database.form.sendFailed")}
          </div>
        )}

        <div className="form-page__actions">
          <Button
            type="submit"
            variant="primary"
            className="form-page__submit"
            disabled={preview || submit.isPending}
          >
            {submit.isPending
              ? t("database.form.sending")
              : t("database.form.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
