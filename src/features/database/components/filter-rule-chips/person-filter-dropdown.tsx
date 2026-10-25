import { useMemo, useState } from "react";
import { UserRound } from "src/components/icons";
import { useTranslation } from "react-i18next";
import type { DatabaseProperty, ID } from "src/types";
import type { PersonFilterRule } from "src/types/filter-types";
import { useWorkspacePeople } from "../../hooks/use-workspace-people";
import { ME_FILTER_VALUE } from "../../utils/apply-filters";
import { FilterRuleHeader } from "./filter-rule-header";
import "./select-filter-dropdown.scss";
import "../../primitives/person-cell-display.scss";

// Person, Created by and Edited by filters: pick people, or "Me" — whoever
// is looking at the view, so one shared view shows each person their own.

/** Person ids of a rule (older rules store one id string). */
function personRuleValue(rule: PersonFilterRule): string[] {
  const v = rule.value;
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

export function PersonFilterDropdown({
  property,
  rule,
  onUpdate,
  onDelete,
  onPromote,
}: {
  property: DatabaseProperty;
  rule: PersonFilterRule;
  onUpdate: (id: ID, patch: Partial<PersonFilterRule>) => void;
  onDelete: (id: ID) => void;
  onPromote: () => void;
}) {
  const { t } = useTranslation();
  const people = useWorkspacePeople();
  const ids = personRuleValue(rule);
  const selected = useMemo(() => new Set(ids), [ids]);

  const [search, setSearch] = useState("");
  const meLabel = t("database.person.me");

  const rows = useMemo(() => {
    const all = [
      { id: ME_FILTER_VALUE, name: meLabel, avatarUrl: undefined, me: true },
      ...people.map((p) => ({ ...p, me: false })),
    ];
    const q = search.trim().toLowerCase();
    return q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all;
  }, [people, search, meLabel]);

  // Keep value[] and labels[] in step. Ids that no longer resolve to a
  // person keep their stored label so the chip still reads well.
  function commit(next: string[]) {
    const labelOf = (id: string) => {
      if (id === ME_FILTER_VALUE) return meLabel;
      const person = people.find((p) => p.id === id);
      if (person) return person.name;
      const i = ids.indexOf(id);
      return rule.labels?.[i] ?? id;
    };
    onUpdate(rule.id, { value: next, labels: next.map(labelOf) });
  }

  function toggle(id: string) {
    commit(selected.has(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  return (
    <div className="select-filter-dropdown">
      <FilterRuleHeader
        propertyName={property.name}
        rule={rule}
        onChange={(patch) =>
          onUpdate(rule.id, patch as Partial<PersonFilterRule>)
        }
        onDelete={() => onDelete(rule.id)}
        onPromote={onPromote}
      />
      <input
        className="select-filter-dropdown__search"
        placeholder={t("database.person.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      <div className="select-filter-dropdown__list">
        {rows.length === 0 && (
          <span className="select-filter-dropdown__empty">
            {t("database.person.none")}
          </span>
        )}
        {rows.map((p) => (
          <button
            type="button"
            key={p.id}
            className="select-filter-dropdown__row"
            onClick={() => toggle(p.id)}
          >
            <span
              className="select-filter-dropdown__checkbox"
              data-checked={selected.has(p.id) || undefined}
              aria-hidden
            />
            <span className="db-person-chip__avatar" aria-hidden>
              {p.me ? (
                <UserRound size={12} />
              ) : p.avatarUrl ? (
                <img src={p.avatarUrl} alt="" />
              ) : (
                (p.name?.[0]?.toUpperCase() ?? "?")
              )}
            </span>
            <span className="tiptap-button-text">{p.name}</span>
            {p.me && (
              <span className="select-filter-dropdown__hint">
                {t("database.person.meHint")}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
