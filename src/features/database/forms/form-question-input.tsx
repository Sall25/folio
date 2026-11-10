import { useTranslation } from "react-i18next";
import type {
  DatabaseProperty,
  FileValue,
  SelectOption,
} from "src/types";
import { FilesCellDisplay } from "../primitives/files-cell-display";

/** One question's answer field, by its property's type. `name` groups a
 *  question's radio buttons. */
export function FormQuestionInput({
  property,
  value,
  onChange,
  disabled,
  inputId,
}: {
  property: DatabaseProperty;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  /** The field's id, for the question's <label>. */
  inputId: string;
}) {
  const { t } = useTranslation();
  const config = property.config;

  switch (config.type) {
    case "title":
    case "url":
    case "email":
    case "phone":
      return (
        <input
          id={inputId}
          className="form-input"
          type={
            config.type === "url"
              ? "url"
              : config.type === "email"
                ? "email"
                : config.type === "phone"
                  ? "tel"
                  : "text"
          }
          value={(value as string) ?? ""}
          placeholder={
            config.type === "url" ? "https://…" : t("database.form.yourAnswer")
          }
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "text":
      return (
        <textarea
          id={inputId}
          className="form-input form-input--long"
          rows={3}
          value={(value as string) ?? ""}
          placeholder={t("database.form.yourAnswer")}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <input
          id={inputId}
          className="form-input form-input--short"
          type="number"
          inputMode="decimal"
          value={value == null ? "" : String(value)}
          disabled={disabled}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );

    case "date": {
      const iso = typeof value === "string" ? value : null;
      return (
        <input
          id={inputId}
          className="form-input form-input--short"
          type="date"
          value={iso ? iso.slice(0, 10) : ""}
          disabled={disabled}
          onChange={(e) =>
            onChange(
              e.target.value
                ? new Date(`${e.target.value}T00:00:00`).toISOString()
                : null,
            )
          }
        />
      );
    }

    case "checkbox":
      return (
        <label className="form-choice">
          <input
            id={inputId}
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{t("database.form.yes")}</span>
        </label>
      );

    case "select":
      return (
        <div className="form-choices" role="radiogroup" id={inputId}>
          {config.options.map((o) => (
            <label key={o.id} className="form-choice">
              <input
                type="radio"
                name={`${inputId}-choice`}
                checked={(value as SelectOption | null)?.id === o.id}
                disabled={disabled}
                onChange={() => onChange(o)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      );

    case "multi_select": {
      const picked = (value as SelectOption[] | null) ?? [];
      return (
        <div className="form-choices" id={inputId}>
          {config.options.map((o) => {
            const on = picked.some((p) => p.id === o.id);
            return (
              <label key={o.id} className="form-choice">
                <input
                  type="checkbox"
                  checked={on}
                  disabled={disabled}
                  onChange={() =>
                    onChange(
                      on ? picked.filter((p) => p.id !== o.id) : [...picked, o],
                    )
                  }
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case "status":
      return (
        <div className="form-choices" role="radiogroup" id={inputId}>
          {config.groups
            .flatMap((g) => g.items)
            .map((i) => (
              <label key={i.id} className="form-choice">
                <input
                  type="radio"
                  name={`${inputId}-choice`}
                  checked={value === i.id}
                  disabled={disabled}
                  onChange={() => onChange(i.id)}
                />
                <span>{i.name}</span>
              </label>
            ))}
        </div>
      );

    case "files":
      return (
        <div className="form-files" id={inputId}>
          <FilesCellDisplay
            value={(value as FileValue[] | null) ?? []}
            onChange={(v) => onChange(v)}
            readonly={disabled}
            large
          />
        </div>
      );

    default:
      return null;
  }
}
