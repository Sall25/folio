import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ID } from "src/types";
import {
  getForm,
  rememberPendingForm,
  submitFormResponse,
  type FormPayload,
} from "src/api/forms";
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
//
// Also shown inside the app, as the form builder's Preview (FormPreview):
// given the ids, with Close where the page would leave.
export function FormPage({
  sourceId,
  viewId,
  onClose,
}: { sourceId?: ID; viewId?: ID; onClose?: () => void } = {}) {
  const { t } = useTranslation();
  // Plain location: this page also opens outside the app's router, for
  // people who aren't signed in (App.tsx).
  const ids =
    sourceId && viewId
      ? { sourceId, viewId }
      : idsFromPath(window.location.pathname);
  const embedded = !!onClose;
  const leave = () => (onClose ? onClose() : window.location.assign("/"));
  const leaveLabel = embedded
    ? t("database.form.close")
    : t("database.form.backHome");

  const form = useQuery({
    queryKey: ["form", ids?.sourceId, ids?.viewId],
    // Never left hanging: an answer within 15 s, or an error with Retry.
    queryFn: () =>
      Promise.race([
        getForm(ids!.sourceId, ids!.viewId),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(t("database.form.timeout"))),
            15_000,
          ),
        ),
      ]),
    enabled: !!ids,
    staleTime: 0,
    retry: 1,
    // Asks even when the browser thinks it's offline (wrong on some
    // desktops): a real failure shows as an error, never a paused load.
    networkMode: "always",
    // A fresh copy every time: never one restored from the saved cache.
    gcTime: 0,
  });

  const [answers, setAnswers] = useState<Record<ID, unknown>>({});
  const [missing, setMissing] = useState<ID[]>([]);
  const [rowId, setRowId] = useState<ID | null>(null);

  const raw = form.data;
  const needsSignIn = !!raw && "needsSignIn" in raw;
  const data = raw && !needsSignIn ? (raw as FormPayload) : null;
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
            {rowId && !data?.anonymous && (
              <Button
                variant="primary"
                onClick={() => window.location.assign(`/page/${rowId}`)}
              >
                {t("database.form.seeAnswer")}
              </Button>
            )}
            <Button variant="ghost" onClick={leave}>
              {leaveLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!ids) return state(t("database.form.notFound"));
  if (form.isPending && form.fetchStatus !== "idle")
    return (
      <div className="form-page" aria-busy="true">
        <div className="form-page__column">
          <div className="form-page__card form-page__state">
            <div className="form-page__spinner" aria-hidden />
            <p className="form-page__description">
              {t("database.form.loading")}
            </p>
          </div>
        </div>
      </div>
    );
  if (form.isError)
    return (
      <div className="form-page">
        <div className="form-page__column">
          <div className="form-page__card form-page__state">
            <h1 className="form-page__title">
              {t("database.form.loadFailed")}
            </h1>
            <p className="form-page__description">
              {form.error instanceof Error
                ? form.error.message
                : String(form.error)}
            </p>
            <div className="form-page__actions">
              <Button variant="primary" onClick={() => void form.refetch()}>
                {t("database.form.retry")}
              </Button>
              <Button variant="ghost" onClick={leave}>
                {leaveLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  if (needsSignIn)
    return (
      <div className="form-page">
        <div className="form-page__column">
          <div className="form-page__card form-page__state">
            <h1 className="form-page__title">
              {t("database.form.signInTitle")}
            </h1>
            <p className="form-page__description">
              {t("database.form.signInHint")}
            </p>
            <Button
              variant="primary"
              onClick={() => {
                rememberPendingForm(window.location.pathname);
                window.location.assign("/signin");
              }}
            >
              {t("database.form.signIn")}
            </Button>
          </div>
        </div>
      </div>
    );
  if (!data)
    return state(t("database.form.notFound"), t("database.form.notFoundHint"));
  if (rowId)
    return state(
      t("database.form.thanks"),
      data.anonymous ? undefined : t("database.form.thanksHint"),
    );

  const preview = !data.canAnswer && data.canEdit;
  if (data.closed && !preview)
    return state(t("database.form.closedTitle"), t("database.form.closedHint"));
  if (data.answered && data.view.onePerPerson && !data.anonymous && !preview)
    return state(
      t("database.form.answeredTitle"),
      t("database.form.answeredHint"),
    );

  const title = data.view.formTitle || data.databaseTitle;

  return (
    <div className="form-page">
      <form className="form-page__column" onSubmit={onSubmit} noValidate>
        {!embedded && (
          <button
            type="button"
            className="form-page__back"
            onClick={() =>
              window.history.length > 1
                ? window.history.back()
                : window.location.assign("/")
            }
          >
            ← {t("database.form.back")}
          </button>
        )}
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
        {data.anonymous && (
          <div className="form-page__notice">
            {t("database.form.anonymousNotice")}
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
