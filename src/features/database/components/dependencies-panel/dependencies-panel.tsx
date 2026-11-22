import { useTranslation } from "react-i18next";
import type {
  DatabaseProperty,
  DatabaseView,
  DependenciesSettings,
} from "src/types";
import type { UseDatabaseReturn } from "../../hooks";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { MenuRow } from "../menu-row";
import { DEFAULT_DEPENDENCIES, dependencyPair } from "../../utils/dependencies";
import "./dependencies-panel.scss";

const newId = () =>
  crypto.randomUUID?.() ??
  `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/** View options › Dependencies: turn the database's dependencies on or off
 *  (a relation of the database with itself, as a pair of properties), name
 *  them, and choose what this view does with them. Built the same way the
 *  sub-items panel is, because the two are the same kind of thing. */
export function DependenciesPanel({
  view,
  db,
}: {
  view: DatabaseView;
  db: UseDatabaseReturn;
}) {
  const { t } = useTranslation();
  const { source } = useDatabaseContext();
  const { updatePropertiesAsync } = useDataSource(source?.id);
  const properties = source?.properties ?? [];
  const pair = dependencyPair(properties, source?.id);
  const settings = { ...DEFAULT_DEPENDENCIES, ...(view.dependencies ?? {}) };
  const set = (next: Partial<DependenciesSettings>) =>
    db.updateView(view.id, {
      dependencies: { ...(view.dependencies ?? {}), ...next },
    } as Partial<DatabaseView>);

  const turnOn = () => {
    if (!source) return;
    // A relation of this database with itself, with its mirror and not
    // already the sub-item pair, can become the pair; otherwise a new pair
    // is made.
    const existing = properties.find(
      (p) =>
        p.config.type === "relation" &&
        p.config.targetSourceId === source.id &&
        p.config.showOnTarget &&
        !p.config.subItems &&
        !!p.config.mirrorPropertyId &&
        properties.some(
          (q) =>
            q.id ===
            (p.config as { mirrorPropertyId: string }).mirrorPropertyId,
        ),
    );
    if (existing) {
      void updatePropertiesAsync(
        properties.map((p) =>
          p.id === existing.id
            ? ({
                ...p,
                config: { ...p.config, dependency: true },
              } as DatabaseProperty)
            : p,
        ),
      );
      return;
    }
    const blockingId = newId();
    const blockedById = newId();
    const blocking: DatabaseProperty = {
      id: blockingId,
      name: t("database.dependencies.blocking"),
      config: {
        type: "relation",
        targetSourceId: source.id,
        showOnTarget: true,
        mirrorPropertyId: blockedById,
        dependency: true,
      },
      width: 200,
    } as DatabaseProperty;
    const blockedBy: DatabaseProperty = {
      id: blockedById,
      name: t("database.dependencies.blockedBy"),
      config: {
        type: "relation",
        targetSourceId: source.id,
        showOnTarget: false,
        mirrorPropertyId: blockingId,
      },
      width: 200,
    } as DatabaseProperty;
    void updatePropertiesAsync([...properties, blocking, blockedBy]);
  };

  // Off keeps both properties (and every link): they become plain
  // relations, and turning it on again picks them up.
  const turnOff = () => {
    if (!pair) return;
    void updatePropertiesAsync(
      properties.map((p) =>
        p.id === pair.blocking.id
          ? ({
              ...p,
              config: { ...p.config, dependency: false },
            } as DatabaseProperty)
          : p,
      ),
    );
  };

  const rename = (property: DatabaseProperty, name: string) => {
    const clean = name.trim();
    if (!clean || clean === property.name) return;
    void updatePropertiesAsync(
      properties.map((p) => (p.id === property.id ? { ...p, name: clean } : p)),
    );
  };

  return (
    <div className="dependencies-panel">
      <MenuRow
        label={t("database.dependencies.title")}
        toggle
        checked={!!pair}
        onToggle={() => (pair ? turnOff() : turnOn())}
      />
      <span className="dependencies-panel__note">
        {pair
          ? t("database.dependencies.onNote")
          : t("database.dependencies.offNote")}
      </span>

      {pair && (
        <>
          <label className="dependencies-panel__name">
            <span>{t("database.dependencies.blockingLabel")}</span>
            <input
              key={`b-${pair.blocking.id}-${pair.blocking.name}`}
              defaultValue={pair.blocking.name}
              onBlur={(e) => rename(pair.blocking, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </label>
          {pair.blockedBy && (
            <label className="dependencies-panel__name">
              <span>{t("database.dependencies.blockedByLabel")}</span>
              <input
                key={`w-${pair.blockedBy.id}-${pair.blockedBy.name}`}
                defaultValue={pair.blockedBy.name}
                onBlur={(e) => rename(pair.blockedBy!, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
            </label>
          )}

          <MenuRow
            label={t("database.dependencies.showArrows")}
            toggle
            checked={!settings.hidden}
            onToggle={() => set({ hidden: !settings.hidden })}
          />

          {/* What happens to a record when something blocking it moves —
              the three shift modes and avoiding weekends — lands with the
              shifting itself. The settings are in DependenciesSettings
              already; a switch that does nothing is worse than one that is
              not there yet. */}
        </>
      )}
    </div>
  );
}
