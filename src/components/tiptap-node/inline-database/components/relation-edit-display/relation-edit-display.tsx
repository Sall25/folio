import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, Database, Search } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { useDataSource } from "../../hooks/use-data-source";
import type { DatabaseProperty, DataSource, PropertyConfig } from "src/types";
import { useDataSources } from "src/hooks/use-data-sources";

type RelationConfig = Extract<PropertyConfig, { type: "relation" }>;

function newPropId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Relation property config editor.
 *
 * - Pick the related database (targetDatabaseId).
 * - "Show on related database" (showOnTarget): two-way sync. Turning it on
 *   creates a mirror relation property on the TARGET source that points back
 *   here, storing its id in this config's mirrorPropertyId. Turning it off
 *   removes that mirror. The mirror's display name is editable below, and the
 *   Preview shows both sides of the link.
 */
export function RelationEditDisplay({
  prop,
  source,
  onChange,
}: {
  prop: DatabaseProperty;
  /** the CURRENT database — needed to point the mirror back + name it */
  source?: DataSource;
  onChange: (config: RelationConfig, name?: string) => void;
}) {
  const { data: sources, isLoading } = useDataSources();
  const [query, setQuery] = useState("");

  const config = prop.config as RelationConfig;
  const targetId = config.targetSourceId;

  // Load the target so we can read/mutate its properties (the mirror lives
  // there). updatePropertiesAsync is a whole-source properties PATCH.
  const { source: target, updatePropertiesAsync } = useDataSource(
    targetId || null,
  );

  const currentName = source?.name?.trim() || "This database";
  const targetName =
    ((sources as DataSource[]) ?? [])
      .find((s) => s.id === targetId)
      ?.name?.trim() || "related database";

  // The mirror property on the target (if synced).
  const mirror = target?.properties.find(
    (p) => p.id === config.mirrorPropertyId,
  );

  // Editable mirror name (adopt external changes when not editing).
  const [mirrorName, setMirrorName] = useState(mirror?.name ?? "");
  const [prevMirror, setPrevMirror] = useState(mirror?.name ?? "");
  if ((mirror?.name ?? "") !== prevMirror) {
    setPrevMirror(mirror?.name ?? "");
    setMirrorName(mirror?.name ?? "");
  }

  const filtered = useMemo(
    () =>
      ((sources as DataSource[]) ?? []).filter((s) =>
        (s.name ?? "Untitled")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [sources, query],
  );

  // ── Mirror lifecycle ────────────────────────────────────────────────────
  const removeMirror = async () => {
    if (!target || !config.mirrorPropertyId) return;
    await updatePropertiesAsync(
      target.properties.filter((p) => p.id !== config.mirrorPropertyId),
    );
  };

  const setTarget = async (id: string) => {
    // Changing the related DB drops any existing mirror on the OLD target and
    // resets two-way (must be re-enabled for the new target).
    if (config.showOnTarget && config.mirrorPropertyId) {
      await removeMirror();
    }

    // Auto-name the property after the related database — but only if the
    // user hasn't already given it a custom name.
    const targetSourceName =
      ((sources as DataSource[]) ?? [])
        .find((s) => s.id === id)
        ?.name?.trim() || "";
    const DEFAULT_NAMES = ["relation", "new property", ""];
    const isDefaultName = DEFAULT_NAMES.includes(
      prop.name.trim().toLowerCase(),
    );

    onChange(
      {
        ...config,
        targetSourceId: id,
        showOnTarget: false,
        mirrorPropertyId: null,
      },
      isDefaultName ? targetSourceName || "Related" : undefined,
    );
  };

  const toggleShowOnTarget = async () => {
    if (!targetId || !target || !source?.id) return;

    if (config.showOnTarget) {
      // OFF — remove the mirror property from the target.
      await removeMirror();
      onChange({ ...config, showOnTarget: false, mirrorPropertyId: null });
    } else {
      // ON — create a mirror relation on the target pointing back here.
      const mirrorId = newPropId();
      const mirrorProp: DatabaseProperty = {
        id: mirrorId,
        name: currentName,
        config: {
          type: "relation",
          targetSourceId: source.id,
          showOnTarget: false,
          mirrorPropertyId: prop.id,
        },
      };
      await updatePropertiesAsync([...target.properties, mirrorProp]);
      onChange({ ...config, showOnTarget: true, mirrorPropertyId: mirrorId });
    }
  };

  const commitMirrorName = async () => {
    if (!target || !config.mirrorPropertyId) return;
    const name = mirrorName.trim() || currentName;
    if (name === mirror?.name) return;
    await updatePropertiesAsync(
      target.properties.map((p) =>
        p.id === config.mirrorPropertyId ? { ...p, name } : p,
      ),
    );
  };

  return (
    <Card style={{ padding: "5px 10px", minWidth: 260 }}>
      <CardGroupLabel>Related to</CardGroupLabel>

      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 6px",
          borderRadius: "var(--tt-radius-sm)",
          background: "var(--tt-bg-subtle, rgba(0,0,0,0.04))",
          margin: "4px 0",
        }}
      >
        <Search size={13} style={{ opacity: 0.6 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search databases…"
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            width: "100%",
            fontSize: 13,
            color: "var(--tt-text-primary)",
            fontFamily: "inherit",
          }}
        />
      </div>

      <CardItemGroup
        style={{
          maxHeight: 200,
          overflowY: "auto",
          width: "100%",
          justifyContent: "flex-start",
        }}
      >
        {isLoading ? (
          <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
            Loading…
          </span>
        ) : filtered.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--tt-text-secondary)" }}>
            No databases
          </span>
        ) : (
          filtered.map((s) => {
            const selected = s.id === targetId;
            return (
              <Button
                key={s.id}
                variant="ghost"
                onClick={() => setTarget(s.id)}
                style={{
                  justifyContent: "flex-start",
                  width: "100%",
                  gap: 8,
                  borderRadius: "var(--tt-radius-sm)",
                }}
              >
                <Database className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">
                  {s.name ?? "Untitled"}
                </span>
                {selected && (
                  <Check
                    size={14}
                    style={{
                      marginLeft: "auto",
                      color: "var(--tt-brand-color-400)",
                    }}
                  />
                )}
              </Button>
            );
          })
        )}
      </CardItemGroup>

      <Separator orientation="horizontal" />

      {/* Two-way toggle */}
      <Button
        variant="ghost"
        onClick={toggleShowOnTarget}
        disabled={!targetId || !source?.id}
        style={{
          justifyContent: "flex-start",
          width: "100%",
          gap: 8,
          opacity: targetId && source?.id ? 1 : 0.5,
        }}
      >
        <span className="tiptap-button-text">Show on {targetName}</span>
        {config.showOnTarget && (
          <Check
            size={14}
            style={{ marginLeft: "auto", color: "var(--tt-brand-color-400)" }}
          />
        )}
      </Button>

      {/* ── Two-way extras (only when synced) ─────────────────────────────── */}
      {config.showOnTarget && (
        <>
          {/* Related property name on the target */}
          <CardGroupLabel>Related property on {targetName}</CardGroupLabel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              margin: "2px 0 6px",
              borderRadius: "var(--tt-radius-sm)",
              background: "var(--tt-bg-subtle, rgba(0,0,0,0.04))",
            }}
          >
            <ArrowLeftRight size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
            <input
              value={mirrorName}
              onChange={(e) => setMirrorName(e.target.value)}
              onBlur={commitMirrorName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitMirrorName();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder={currentName}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: 13,
                color: "var(--tt-text-primary)",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Preview — both sides of the link */}
          <CardGroupLabel>Preview</CardGroupLabel>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "8px 6px 4px",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--tt-text-primary)" }}>
              {prop.name || "Relation"}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--tt-text-secondary)",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Database size={13} />
                {currentName}
              </span>
              <ArrowLeftRight
                size={14}
                style={{ color: "var(--tt-brand-color-400)" }}
              />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Database size={13} />
                {targetName}
              </span>
            </div>
            <span style={{ fontSize: 13, color: "var(--tt-text-primary)" }}>
              {mirrorName.trim() || currentName}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
