import { useTranslation } from "react-i18next";
import type {
  DatabaseProperty,
  DatabaseView,
  SubItemsSettings,
} from "src/types";
import type { UseDatabaseReturn } from "../../hooks";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { MenuRow } from "../menu-row";
import { DEFAULT_SUB_ITEMS, subItemPair } from "../../utils/sub-items";
import "./sub-items-panel.scss";

const newId = () =>
  crypto.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/** View options › Sub-items: turn the database's sub-items on or off (a
 *  relation of the database with itself, as a pair of properties), name
 *  them, and choose how this view shows them. */
export function SubItemsPanel({
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
  const pair = subItemPair(properties, source?.id);
  const settings = { ...DEFAULT_SUB_ITEMS, ...(view.subItems ?? {}) };
  const set = (next: Partial<SubItemsSettings>) =>
    db.updateView(view.id, {
      subItems: { ...(view.subItems ?? {}), ...next },
    } as Partial<DatabaseView>);

  const turnOn = () => {
    if (!source) return;
    // A relation of this database with itself, with its mirror, can become
    // the pair; otherwise a new pair is made.
    const existing = properties.find(
      (p) =>
        p.config.type === "relation" &&
        p.config.targetSourceId === source.id &&
        p.config.showOnTarget &&
        !!p.config.mirrorPropertyId &&
        properties.some((q) => q.id === (p.config as { mirrorPropertyId: string }).mirrorPropertyId),
    );
    if (existing) {
      void updatePropertiesAsync(
        properties.map((p) =>
          p.id === existing.id
            ? ({ ...p, config: { ...p.config, subItems: true } } as DatabaseProperty)
            : p,
        ),
      );
      return;
    }
    const parentId = newId();
    const childrenId = newId();
    const parent: DatabaseProperty = {
      id: parentId,
      name: t("database.subItems.parent"),
      config: {
        type: "relation",
        targetSourceId: source.id,
        showOnTarget: true,
        mirrorPropertyId: childrenId,
        subItems: true,
      },
      width: 200,
    } as DatabaseProperty;
    const children: DatabaseProperty = {
      id: childrenId,
      name: t("database.subItems.children"),
      config: {
        type: "relation",
        targetSourceId: source.id,
        showOnTarget: false,
        mirrorPropertyId: parentId,
      },
      width: 200,
    } as DatabaseProperty;
    void updatePropertiesAsync([...properties, parent, children]);
  };

  // Off keeps both properties (and every row's parent): they become plain
  // relations, and turning it on again picks them up.
  const turnOff = () => {
    if (!pair) return;
    void updatePropertiesAsync(
      properties.map((p) =>
        p.id === pair.parent.id
          ? ({ ...p, config: { ...p.config, subItems: false } } as DatabaseProperty)
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
    <div className="sub-items-panel">
      <MenuRow
        label={t("database.subItems.title")}
        toggle
        checked={!!pair}
        onToggle={() => (pair ? turnOff() : turnOn())}
      />
      <span className="sub-items-panel__note">
        {pair ? t("database.subItems.onNote") : t("database.subItems.offNote")}
      </span>

      {pair && (
        <>
          <label className="sub-items-panel__name">
            <span>{t("database.subItems.parentLabel")}</span>
            <input
              key={`p-${pair.parent.id}-${pair.parent.name}`}
              defaultValue={pair.parent.name}
              onBlur={(e) => rename(pair.parent, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </label>
          {pair.children && (
            <label className="sub-items-panel__name">
              <span>{t("database.subItems.childrenLabel")}</span>
              <input
                key={`c-${pair.children.id}-${pair.children.name}`}
                defaultValue={pair.children.name}
                onBlur={(e) => rename(pair.children!, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
            </label>
          )}

          <span className="sub-items-panel__title">
            {t("database.subItems.show")}
          </span>
          {(["nested", "flat", "top"] as const).map((d) => (
            <MenuRow
              key={d}
              label={t(`database.subItems.display.${d}`)}
              selected={settings.display === d}
              onClick={() => set({ display: d })}
            />
          ))}

          {settings.display === "nested" && (
            <>
              <span className="sub-items-panel__title">
                {t("database.subItems.filters")}
              </span>
              <MenuRow
                label={t("database.subItems.filtersAll")}
                selected={settings.filters === "all"}
                onClick={() => set({ filters: "all" })}
              />
              <MenuRow
                label={t("database.subItems.filtersTop")}
                selected={settings.filters === "top"}
                onClick={() => set({ filters: "top" })}
              />
              <span className="sub-items-panel__note">
                {settings.filters === "all"
                  ? t("database.subItems.filtersAllNote")
                  : t("database.subItems.filtersTopNote")}
              </span>
              <MenuRow
                label={t("database.subItems.expanded")}
                toggle
                checked={settings.expanded}
                onToggle={() => set({ expanded: !settings.expanded })}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
