import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "src/hooks/use-session";
import {
  findPerson,
  useWorkspacePeople,
} from "../../hooks/use-workspace-people";
import { useDatabaseContext } from "../../context/database-context";
import { UNASSIGNED } from "../../utils/assignee";
import "./person-filter-bar.scss";

/** The people bar: one pill per assignee with their row count, plus
 *  Unassigned. Picking pills filters the view to those people (any of
 *  them); it's a quick look, not a saved filter. */
export function PersonFilterBar() {
  const { t } = useTranslation();
  const { db, peopleCounts } = useDatabaseContext();
  // The rows keep a copy of each person from when they were assigned; the
  // workspace's list is the current one (a photo added since, a new name).
  const workspacePeople = useWorkspacePeople();
  const meId = useSession().session?.user.id ?? null;
  const picked = db.personFilter;

  const entries = useMemo(() => {
    if (!peopleCounts) return [];
    const people = [...peopleCounts.entries()]
      .filter(([id]) => id !== UNASSIGNED)
      .sort(([a, x], [b, y]) => {
        if (a === meId) return -1; // you first
        if (b === meId) return 1;
        return (
          y.count - x.count ||
          (x.person?.name ?? "").localeCompare(y.person?.name ?? "")
        );
      });
    return people;
  }, [peopleCounts, meId]);

  if (
    !peopleCounts ||
    db.activeView?.hidePeopleBar ||
    db.activeView?.type === "form" ||
    entries.length === 0
  ) {
    return null;
  }

  const unassigned = peopleCounts.get(UNASSIGNED)?.count ?? 0;
  const toggle = (id: string) =>
    db.setPersonFilter(
      picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id],
    );

  return (
    <div
      className="db-people-bar"
      role="toolbar"
      aria-label={t("database.assign.barLabel")}
      contentEditable={false}
    >
      <button
        type="button"
        className="db-people-bar__pill"
        data-active={picked.length === 0 || undefined}
        onClick={() => db.setPersonFilter([])}
      >
        {t("database.assign.everyone")}
      </button>
      {entries.map(([id, { count, person: stored }]) => {
        const person = findPerson(workspacePeople, id) ?? stored;
        return (
          <button
            key={id}
            type="button"
            className="db-people-bar__pill"
            data-active={picked.includes(id) || undefined}
            aria-pressed={picked.includes(id)}
            onClick={() => toggle(id)}
          >
            <span className="db-people-bar__avatar" aria-hidden>
              {person?.avatarUrl ? (
                <img src={person.avatarUrl} alt="" />
              ) : (
                (person?.name?.[0]?.toUpperCase() ?? "?")
              )}
            </span>
            <span className="db-people-bar__name">
              {id === meId ? t("database.assign.me") : person?.name}
            </span>
            <span className="db-people-bar__count">{count}</span>
          </button>
        );
      })}
      {unassigned > 0 && (
        <button
          type="button"
          className="db-people-bar__pill"
          data-active={picked.includes(UNASSIGNED) || undefined}
          aria-pressed={picked.includes(UNASSIGNED)}
          onClick={() => toggle(UNASSIGNED)}
        >
          <span
            className="db-people-bar__avatar db-people-bar__avatar--none"
            aria-hidden
          />
          <span className="db-people-bar__name">
            {t("database.assign.unassigned")}
          </span>
          <span className="db-people-bar__count">{unassigned}</span>
        </button>
      )}
    </div>
  );
}
