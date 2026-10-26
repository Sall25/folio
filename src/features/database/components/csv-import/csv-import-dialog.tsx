import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, X } from "src/components/icons";
import { MaterialIcon } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { SpinnerRing } from "src/components/tiptap-ui-primitive/spinner-ring";
import type { DatabaseProperty, Page, Person } from "src/types";
import { getTypeMeta } from "src/types/property-type-meta";
import { createPages } from "src/api/pages";
import { queryKeys } from "src/lib/queryKeys";
import { makeRow } from "src/utils/make-row";
import { usePeopleBase } from "src/hooks/use-people";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useToast } from "src/features/shell/toast";
import { useDataSource } from "../../hooks/use-data-source";
import { csvImportStore } from "../../utils/csv-import-store";
import {
  IMPORTABLE_TYPES,
  guessColumns,
  isImportable,
  parseCsv,
  planImport,
  type ColumnTarget,
  type CsvTable,
  type ImportPlan,
} from "../../utils/csv-import";
import "./csv-import-dialog.scss";

// The import dialog: the file's columns, where each one goes (the title, an
// existing property, a new property, or nowhere), a preview of the first
// values, then the rows are created in one go. Opened from the view options
// (csvImportStore) and drawn by the database, so it outlives the menu.

const PREVIEW_ROWS = 3;
const allPeople = (people: Person[]) => people;

/** Mounted once per database (DatabaseProvider). */
export function CsvImportHost({
  databaseId,
  sourceId,
  title,
}: {
  databaseId: string;
  sourceId: string | null | undefined;
  title: string;
}) {
  const open = useSyncExternalStore(
    csvImportStore.subscribe,
    csvImportStore.getSnapshot,
  );
  if (!open || open.databaseId !== databaseId || !sourceId) return null;
  return (
    <CsvImportDialog
      key={`${open.file.name}-${open.file.lastModified}`}
      file={open.file}
      sourceId={sourceId}
      title={title}
      onClose={csvImportStore.close}
    />
  );
}

// Select values: "title", "skip", "prop:<id>", "new:<type>".
const encode = (t: ColumnTarget) =>
  t.kind === "property"
    ? `prop:${t.propertyId}`
    : t.kind === "new"
      ? `new:${t.type}`
      : t.kind;

function decode(value: string, header: string): ColumnTarget {
  if (value === "title" || value === "skip") return { kind: value };
  if (value.startsWith("prop:"))
    return { kind: "property", propertyId: value.slice(5) };
  return {
    kind: "new",
    type: value.slice(4) as (typeof IMPORTABLE_TYPES)[number],
    name: header,
  };
}

function CsvImportDialog({
  file,
  sourceId,
  title,
  onClose,
}: {
  file: File;
  sourceId: string;
  title: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { show } = useToast();
  const qc = useQueryClient();
  const { source, updatePropertiesAsync } = useDataSource(sourceId);
  const { data: people = [] } = usePeopleBase(allPeople);
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();

  const [table, setTable] = useState<CsvTable | null>(null);
  const [readError, setReadError] = useState(false);
  // null until changed: the first guess is derived from the file.
  const [edited, setEdited] = useState<ColumnTarget[] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  // Read the file once.
  useEffect(() => {
    let cancelled = false;
    file
      .text()
      .then((text) => {
        if (cancelled) return;
        const parsed = parseCsv(text);
        if (parsed.headers.length === 0) setReadError(true);
        else setTable(parsed);
      })
      .catch(() => !cancelled && setReadError(true));
    return () => {
      cancelled = true;
    };
  }, [file]);

  // The first guess, once both the file and the database are in.
  const properties = useMemo(() => source?.properties ?? [], [source]);
  const guessed = useMemo(
    () => (table && properties.length ? guessColumns(table, properties) : []),
    [table, properties],
  );
  const targets = edited ?? guessed;

  const ctx = useMemo(
    () => ({
      people,
      dateFallback: (i18n.language.startsWith("en") ? "mdy" : "dmy") as
        "mdy" | "dmy",
    }),
    [people, i18n.language],
  );

  // A dry run for the hints (new options, unreadable cells, unknown people).
  const preview: ImportPlan | null = useMemo(
    () =>
      table && targets.length
        ? planImport(table, targets, properties, ctx)
        : null,
    [table, targets, properties, ctx],
  );

  const importing = progress !== null;
  const close = () => !importing && onClose();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const setTarget = (col: number, value: string) => {
    if (!table) return;
    const next = targets.map((tg, i) => {
      if (i === col) return decode(value, table.headers[col]);
      // One title column, one column per existing property.
      if (value === "title" && tg.kind === "title")
        return { kind: "skip" } as const;
      if (value.startsWith("prop:") && encode(tg) === value)
        return { kind: "skip" } as const;
      return tg;
    });
    setEdited(next);
  };

  const runImport = async () => {
    if (!table || !source || !person || !workspaceId) return;
    setFailed(false);
    setProgress(0);
    try {
      const plan = planImport(table, targets, source.properties, ctx);
      const changed =
        JSON.stringify(plan.properties) !== JSON.stringify(source.properties);
      if (changed) await updatePropertiesAsync(plan.properties);

      const withNewProps = { ...source, properties: plan.properties };
      const me = {
        id: person.id,
        name: person.name || person.email,
        ...(person.avatarUrl ? { avatarUrl: person.avatarUrl } : {}),
      };
      const pages: Page[] = plan.rows.map((row) => {
        const page = makeRow(withNewProps, {
          ownerId: person.id,
          workspaceId,
          title: row.title,
          me,
        });
        return { ...page, values: { ...page.values, ...row.values } };
      });

      await createPages(pages, setProgress);
      await qc.invalidateQueries({ queryKey: queryKeys.pages.all });
      show(t("database.import.done", { count: pages.length }), "success");
      onClose();
    } catch (error) {
      console.error("Import failed", error);
      setFailed(true);
      setProgress(null);
    }
  };

  const rowCount = table?.rows.length ?? 0;
  const separator =
    table?.delimiter === "\t"
      ? t("database.import.tab")
      : `“${table?.delimiter}”`;
  const importable = properties.filter((p) => isImportable(p.config.type));

  const hint = (col: number, target: ColumnTarget): string | null => {
    if (!preview) return null;
    const parts: string[] = [];
    const first = guessed[col];
    if (
      target.kind === "new" &&
      first?.kind === "new" &&
      first.type === target.type &&
      target.type !== "text"
    )
      parts.push(
        t("database.import.detected", { type: typeLabel(target.type) }),
      );
    if (preview.newOptions[col])
      parts.push(
        t("database.import.newOptions", { count: preview.newOptions[col] }),
      );
    if (preview.skippedCells[col])
      parts.push(
        t("database.import.unreadable", { count: preview.skippedCells[col] }),
      );
    if (preview.unknownPeople[col])
      parts.push(
        t("database.import.unknownPeople", {
          count: preview.unknownPeople[col],
        }),
      );
    return parts.length ? parts.join(" · ") : null;
  };

  const warnings = preview
    ? preview.skippedCells.reduce((a, b) => a + b, 0) +
      preview.unknownPeople.reduce((a, b) => a + b, 0)
    : 0;

  return createPortal(
    <div className="csv-import__backdrop" role="presentation" onClick={close}>
      <div
        className="csv-import"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="csv-import__header">
          <MaterialIcon name="upload_file" size={22} />
          <h2 id="csv-import-title">
            {t("database.import.title", { name: title })}
          </h2>
          <Button variant="ghost" onClick={close} disabled={importing}>
            <X className="tiptap-button-icon" />
          </Button>
        </header>

        <div className="csv-import__file">
          <MaterialIcon name="description" size={18} />
          <b>{file.name}</b>
          {table && (
            <span>
              {t("database.import.fileInfo", {
                rows: rowCount,
                columns: table.headers.length,
                separator,
              })}
            </span>
          )}
        </div>

        {readError ? (
          <p className="csv-import__error">{t("database.import.readError")}</p>
        ) : !table || !source || targets.length === 0 ? (
          <div className="csv-import__loading">
            <SpinnerRing />
          </div>
        ) : (
          <div className="csv-import__columns">
            <div className="csv-import__labels">
              <span>{t("database.import.columnInFile")}</span>
              <span />
              <span>{t("database.import.goesInto")}</span>
              <span>{t("database.import.firstRows")}</span>
            </div>
            {table.headers.map((header, col) => {
              const target = targets[col] ?? { kind: "skip" };
              const note = hint(col, target);
              return (
                <div
                  key={col}
                  className="csv-import__row"
                  data-skip={target.kind === "skip" || undefined}
                >
                  <span className="csv-import__header-cell" title={header}>
                    {header}
                  </span>
                  <ArrowRight className="csv-import__arrow" size={16} />
                  <div className="csv-import__target">
                    <select
                      className="csv-import__select"
                      value={encode(target)}
                      disabled={importing}
                      onChange={(e) => setTarget(col, e.target.value)}
                    >
                      <option value="title">
                        {t("database.import.titleColumn")}
                      </option>
                      {importable.length > 0 && (
                        <optgroup label={t("database.import.existing")}>
                          {importable.map((p: DatabaseProperty) => (
                            <option key={p.id} value={`prop:${p.id}`}>
                              {p.name} · {typeLabel(p.config.type)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={t("database.import.newProperty")}>
                        {IMPORTABLE_TYPES.map((type) => (
                          <option key={type} value={`new:${type}`}>
                            {t("database.import.newOfType", {
                              type: typeLabel(type),
                            })}
                          </option>
                        ))}
                      </optgroup>
                      <option value="skip">{t("database.import.skip")}</option>
                    </select>
                    {note && <span className="csv-import__hint">{note}</span>}
                  </div>
                  <div className="csv-import__samples">
                    {table.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                      <span key={i} data-empty={!r[col]?.trim() || undefined}>
                        {r[col]?.trim() || t("database.import.empty")}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="csv-import__footer">
          {failed ? (
            <span className="csv-import__warning">
              <MaterialIcon name="error" size={17} />
              {t("database.import.failed")}
            </span>
          ) : warnings > 0 ? (
            <span className="csv-import__warning">
              <MaterialIcon name="warning" size={17} />
              {t("database.import.warnings", { count: warnings })}
            </span>
          ) : null}
          <span className="csv-import__spacer" />
          {importing ? (
            <span className="csv-import__progress">
              <SpinnerRing />
              {t("database.import.progress", {
                done: progress,
                total: rowCount,
              })}
            </span>
          ) : (
            <>
              <Button variant="ghost" onClick={close}>
                <span className="tiptap-button-text">
                  {t("database.import.cancel")}
                </span>
              </Button>
              <Button
                className="csv-import__submit"
                disabled={!table || !source || rowCount === 0}
                onClick={() => void runImport()}
              >
                <span className="tiptap-button-text">
                  {t("database.import.submit", { count: rowCount })}
                </span>
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

const typeLabel = (type: Parameters<typeof getTypeMeta>[0]) =>
  getTypeMeta(type).label;
