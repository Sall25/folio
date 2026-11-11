import { useTranslation } from "react-i18next";
import type { DatabaseView, FormAudience, FormView, Group } from "src/types";
import { useGroups } from "src/hooks/use-groups";
import type { UseDatabaseReturn } from "../../hooks";
import { MenuRow } from "../../components/menu-row";
import "./form-settings.scss";

/** epoch ms ⇄ the value of an <input type="datetime-local">. */
function toLocalInput(ms: number | null | undefined): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A form view's settings, in View options › Layout: who can answer, and
 *  when it takes answers. */
export function FormSettings({
  view,
  db,
}: {
  view: FormView;
  db: UseDatabaseReturn;
}) {
  const { t } = useTranslation();
  const groups = (useGroups().data ?? []) as Group[];
  const patch = (next: Partial<FormView>) =>
    db.updateView(view.id, next as Partial<DatabaseView>);
  const setAudience = (audience: FormAudience) => patch({ audience });
  const picked = view.audience?.kind === "groups" ? view.audience.groupIds : [];

  return (
    <div className="form-settings">
      <span className="form-settings__title">
        {t("database.form.whoCanAnswer")}
      </span>
      <MenuRow
        label={t("database.form.everyoneInWorkspace")}
        selected={!view.audience || view.audience.kind === "workspace"}
        onClick={() => setAudience({ kind: "workspace" })}
      />
      <MenuRow
        label={t("database.form.anyoneWithLink")}
        selected={view.audience?.kind === "link"}
        onClick={() => setAudience({ kind: "link" })}
      />
      <MenuRow
        label={t("database.form.someGroups")}
        selected={view.audience?.kind === "groups"}
        onClick={() => setAudience({ kind: "groups", groupIds: picked })}
      />
      {view.audience?.kind === "link" && (
        <span className="form-settings__note">
          {t("database.form.linkNote")}
        </span>
      )}
      {view.audience?.kind === "groups" && (
        <div className="form-settings__groups">
          {groups.length === 0 && (
            <span className="form-settings__note">
              {t("database.form.noGroups")}
            </span>
          )}
          {groups.map((g) => {
            const on = picked.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                className="form-settings__chip"
                aria-pressed={on}
                data-on={on || undefined}
                onClick={() =>
                  setAudience({
                    kind: "groups",
                    groupIds: on
                      ? picked.filter((id) => id !== g.id)
                      : [...picked, g.id],
                  })
                }
              >
                {g.name}
              </button>
            );
          })}
        </div>
      )}

      <span className="form-settings__title">
        {t("database.form.answersTitle")}
      </span>
      <MenuRow
        label={t("database.form.accepting")}
        toggle
        checked={!view.closed}
        onToggle={() => patch({ closed: !view.closed })}
      />
      <MenuRow
        label={t("database.form.onePerPerson")}
        toggle
        checked={view.onePerPerson !== false}
        onToggle={() => patch({ onePerPerson: view.onePerPerson === false })}
      />
      <label className="form-settings__field">
        <span>{t("database.form.closesAt")}</span>
        <input
          type="datetime-local"
          className="form-settings__date"
          value={toLocalInput(view.closesAt)}
          onChange={(e) =>
            patch({
              closesAt: e.target.value
                ? new Date(e.target.value).getTime()
                : null,
            })
          }
        />
      </label>
      <span className="form-settings__note">
        {t("database.form.privacyNote")}
      </span>
    </div>
  );
}
