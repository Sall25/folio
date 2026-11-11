import { memo, useEffect, useMemo, useRef, useState } from "react";
import { NodeViewContent } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "src/components/icons";
import type { JSONContent } from "@tiptap/react";
import {
  DEFAULT_CONFIGS,
  PROPERTY_TYPE_META,
  type DatabaseProperty,
  type FormQuestion,
  type FormView,
  type ID,
  type PropertyType,
} from "src/types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { useDatabaseContext } from "../../context/database-context";
import { FormOptionsPopover } from "./form-options-popover";
import { onNewQuestionRequest } from "./new-question-event";
import { useDataSource } from "../../hooks/use-data-source";
import { FormQuestionInput } from "../../forms/form-question-input";
import { FormDescription } from "../../forms/form-description";
import { hasDescription } from "../../forms/form-description-doc";
import {
  ANSWERABLE_TYPES,
  isAnswerable,
  isTriggerType,
  triggerChoices,
} from "../../forms/form-logic";
import "../../forms/form.scss";
import "./database-form-node-view.scss";

const NEW_TYPES = ANSWERABLE_TYPES.filter((t) => t !== "title");

// Fields inside the database block: keep the editor from taking their keys
// and clicks (the same as the database title's field). Captured, so the
// editor never sees them.
const stop = (e: React.SyntheticEvent) => e.stopPropagation();
const keepKeys = { onKeyDownCapture: stop, onMouseDown: stop };

// A form view: build the form here (its questions are the database's
// properties); people fill it in at /form/<source>/<view>, and each answer
// becomes a row. Preview and Share form are on the toolbar (form-share),
// its settings in View options.
function DatabaseFormNodeViewImpl() {
  const { t } = useTranslation();
  const { db, source, title: dbTitle, attrs } = useDatabaseContext();
  const { updatePropertiesAsync } = useDataSource(source?.id);
  const [addOpen, setAddOpen] = useState(false);

  const view = db.activeView as FormView;
  const locked = !!attrs.locked;
  const properties = useMemo(() => source?.properties ?? [], [source]);
  const byId = useMemo(
    () => new Map(properties.map((p) => [p.id, p])),
    [properties],
  );
  const questions = useMemo(
    () => (view.questions ?? []).filter((q) => byId.has(q.propertyId)),
    [view.questions, byId],
  );
  // The view with edits not rendered yet (a field's blur patches right
  // before Preview or Share form is used), so patches build on the latest.
  const latest = useRef(view);
  useEffect(() => {
    latest.current = view;
  }, [view]);
  const patch = (next: Partial<FormView>) => {
    latest.current = { ...latest.current, ...next };
    db.updateView(view.id, next);
  };
  // The description saves a moment after typing stops.
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDescription = (doc: JSONContent) => {
    if (descTimer.current) clearTimeout(descTimer.current);
    latest.current = { ...latest.current, formDescription: doc };
    descTimer.current = setTimeout(
      () => patch({ formDescription: hasDescription(doc) ? doc : undefined }),
      600,
    );
  };
  useEffect(
    () => () => {
      if (descTimer.current) clearTimeout(descTimer.current);
    },
    [],
  );
  // "New question" in View options opens the question menu.
  useEffect(
    () => onNewQuestionRequest(view.id, () => setAddOpen(true)),
    [view.id],
  );
  const setQuestions = (next: FormQuestion[]) => patch({ questions: next });
  const updateQuestion = (propertyId: ID, next: Partial<FormQuestion>) =>
    setQuestions(
      questions.map((q) => (q.propertyId === propertyId ? { ...q, ...next } : q)),
    );
  const move = (index: number, by: -1 | 1) => {
    const next = [...questions];
    const [q] = next.splice(index, 1);
    next.splice(index + by, 0, q);
    // A "show only if" can only follow an earlier question.
    setQuestions(
      next.map((x, i) =>
        x.showIf &&
        next.findIndex((y) => y.propertyId === x.showIf!.propertyId) >= i
          ? { ...x, showIf: null }
          : x,
      ),
    );
  };
  const remove = (propertyId: ID) =>
    setQuestions(
      questions
        .filter((q) => q.propertyId !== propertyId)
        .map((q) =>
          q.showIf?.propertyId === propertyId ? { ...q, showIf: null } : q,
        ),
    );

  const addExisting = (propertyId: ID) => {
    setQuestions([...questions, { propertyId }]);
    setAddOpen(false);
  };
  const addNew = async (type: PropertyType) => {
    setAddOpen(false);
    const property: DatabaseProperty = {
      id: crypto.randomUUID(),
      name: PROPERTY_TYPE_META.find((m) => m.type === type)?.label ?? type,
      config: DEFAULT_CONFIGS[type],
      width: 160,
    };
    await updatePropertiesAsync([...properties, property]);
    patch({ questions: [...questions, { propertyId: property.id }] });
  };

  const unasked = properties.filter(
    (p) =>
      isAnswerable(p.config.type) &&
      !questions.some((q) => q.propertyId === p.id),
  );

  return (
    <div className="db-form" contentEditable={false}>
      <div className="db-form__main">
        <div className="db-form__card db-form__head">
          <input
            key={`title-${view.id}`}
            className="db-form__title"
            defaultValue={view.formTitle ?? ""}
            placeholder={dbTitle || t("database.form.untitled")}
            aria-label={t("database.form.formTitle")}
            {...keepKeys}
            disabled={locked}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (view.formTitle ?? "")) patch({ formTitle: v || undefined });
            }}
          />
          <div className="db-form__description">
            <FormDescription
              key={`desc-${view.id}`}
              value={view.formDescription}
              editable={!locked}
              onChange={saveDescription}
            />
          </div>
        </div>

        {questions.map((q, index) => {
          const property = byId.get(q.propertyId)!;
          const triggers = questions
            .slice(0, index)
            .map((x) => byId.get(x.propertyId))
            .filter(
              (p): p is DatabaseProperty => !!p && isTriggerType(p.config.type),
            );
          const trigger = q.showIf ? byId.get(q.showIf.propertyId) : undefined;
          return (
            <div key={q.propertyId} className="db-form__card db-form__question">
              <div className="db-form__question-top">
                <input
                  key={`label-${property.id}`}
                  className="db-form__question-name"
                  defaultValue={q.label ?? ""}
                  placeholder={property.name}
                  aria-label={t("database.form.question")}
                  disabled={locked}
                  {...keepKeys}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (q.label ?? ""))
                      updateQuestion(q.propertyId, { label: v || undefined });
                  }}
                />
                <span className="db-form__type">
                  <DynamicIcon
                    name={PROPERTY_TYPE_ICONS[property.config.type]}
                    size={16}
                    filled={false}
                  />
                  {PROPERTY_TYPE_META.find((m) => m.type === property.config.type)
                    ?.label ?? property.config.type}
                </span>
                {!locked && (
                  <span className="db-form__question-actions">
                    <Button
                      variant="ghost"
                      size="small"
                      aria-label={t("database.form.moveUp")}
                      tooltip={t("database.form.moveUp")}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="tiptap-button-icon" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      aria-label={t("database.form.moveDown")}
                      tooltip={t("database.form.moveDown")}
                      disabled={index === questions.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="tiptap-button-icon" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="small"
                      aria-label={t("database.form.removeQuestion")}
                      tooltip={t("database.form.removeQuestion")}
                      onClick={() => remove(q.propertyId)}
                    >
                      <Trash2 className="tiptap-button-icon" size={14} />
                    </Button>
                  </span>
                )}
              </div>

              <input
                key={`help-${property.id}`}
                className="db-form__help"
                defaultValue={q.description ?? ""}
                placeholder={t("database.form.addHelp")}
                aria-label={t("database.form.help")}
                {...keepKeys}
                disabled={locked}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (q.description ?? ""))
                    updateQuestion(q.propertyId, { description: v || undefined });
                }}
              />

              {/* What people answer in: a preview, not a field to fill. */}
              <div className="db-form__preview" title={t("database.form.previewHint")}>
                <span className="db-form__preview-label">
                  {t("database.form.previewHint")}
                </span>
                <FormQuestionInput
                  property={property}
                  value={undefined}
                  onChange={() => {}}
                  disabled
                  inputId={`db-form-${view.id}-${property.id}`}
                />
              </div>

              {!locked && (
                <div className="db-form__question-bottom">
                  <label className="db-form__check">
                    <input
                      type="checkbox"
                      checked={!!q.required}
                      onChange={(e) =>
                        updateQuestion(q.propertyId, {
                          required: e.target.checked,
                        })
                      }
                    />
                    {t("database.form.required")}
                  </label>

                  <FormOptionsPopover
                    property={property}
                    onChange={(next) =>
                      void updatePropertiesAsync(
                        properties.map((p) => (p.id === next.id ? next : p)),
                      )
                    }
                  />

                  {triggers.length > 0 && (
                    <span className="db-form__rule">
                      <label htmlFor={`rule-${view.id}-${property.id}`}>
                        {t("database.form.showIf")}
                      </label>
                      <select
                        id={`rule-${view.id}-${property.id}`}
                        className="db-form__select"
                        {...keepKeys}
                        value={q.showIf?.propertyId ?? ""}
                        onChange={(e) =>
                          updateQuestion(q.propertyId, {
                            showIf: e.target.value
                              ? { propertyId: e.target.value, values: [] }
                              : null,
                          })
                        }
                      >
                        <option value="">{t("database.form.always")}</option>
                        {triggers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  )}
                </div>
              )}

              {!locked && q.showIf && trigger && (
                <div className="db-form__rule-values">
                  <span>{t("database.form.isOneOf")}</span>
                  {triggerChoices(trigger, t).map((c) => {
                    const on = q.showIf!.values.includes(c.value);
                    return (
                      <label key={c.value} className="db-form__chip">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            updateQuestion(q.propertyId, {
                              showIf: {
                                propertyId: q.showIf!.propertyId,
                                values: on
                                  ? q.showIf!.values.filter((v) => v !== c.value)
                                  : [...q.showIf!.values, c.value],
                              },
                            })
                          }
                        />
                        {c.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {!locked && (
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="db-form__add">
                <Plus size={16} aria-hidden />
                {t("database.form.addQuestion")}
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="db-panel">
              <Card style={{ padding: "6px", minWidth: 240, maxHeight: 420, overflowY: "auto" }}>
                {unasked.length > 0 && (
                  <CardItemGroup>
                    <span className="db-form__menu-label">
                      {t("database.form.fromProperties")}
                    </span>
                    {unasked.map((p) => (
                      <Button
                        key={p.id}
                        variant="ghost"
                        className="db-form__menu-item"
                        onClick={() => addExisting(p.id)}
                      >
                        <DynamicIcon
                          name={PROPERTY_TYPE_ICONS[p.config.type]}
                          size={16}
                          filled={false}
                          className="tiptap-button-icon"
                        />
                        <span className="tiptap-button-text">{p.name}</span>
                      </Button>
                    ))}
                  </CardItemGroup>
                )}
                <CardItemGroup>
                  <span className="db-form__menu-label">
                    {t("database.form.newQuestion")}
                  </span>
                  {NEW_TYPES.map((type) => (
                    <Button
                      key={type}
                      variant="ghost"
                      className="db-form__menu-item"
                      onClick={() => void addNew(type)}
                    >
                      <DynamicIcon
                        name={PROPERTY_TYPE_ICONS[type]}
                        size={16}
                        filled={false}
                        className="tiptap-button-icon"
                      />
                      <span className="tiptap-button-text">
                        {PROPERTY_TYPE_META.find((m) => m.type === type)?.label ??
                          type}
                      </span>
                    </Button>
                  ))}
                </CardItemGroup>
              </Card>
            </PopoverContent>
          </Popover>
        )}
      </div>


      {/* The rows stay in the document; a form shows none of them. */}
      <NodeViewContent as="div" className="db-form__rows" />
    </div>
  );
}

export const DatabaseFormNodeView = memo(DatabaseFormNodeViewImpl);
