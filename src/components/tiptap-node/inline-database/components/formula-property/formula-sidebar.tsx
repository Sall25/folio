import { useState } from "react";
import { Copy } from "lucide-react";
import type { FormulaProperty, BuiltinFunction } from "./types";
import {
  BUILTIN_FUNCTIONS,
  BUILTIN_CATEGORIES,
  CATEGORY_LABELS,
} from "./config";
import { PROPERTY_TYPE_ICONS } from "./icons";

interface FormulaSidebarProps {
  properties: FormulaProperty[];
  selectedPropertyId: string | null;
  onSelectProperty: (id: string) => void;
  onInsert: (text: string) => void;
}

export function FormulaSidebar({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onInsert,
}: FormulaSidebarProps) {
  const [selectedBuiltin, setSelectedBuiltin] =
    useState<BuiltinFunction | null>(null);
  const selectedProp = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="fp-sidebar-wrap">
      {/* ── Left column: list ── */}
      <div className="fp-sidebar-list">
        <p className="fp-sidebar-group-label">Properties</p>
        {properties.map((prop) => {
          const Icon = PROPERTY_TYPE_ICONS[prop.type];
          return (
            <button
              key={prop.id}
              className={`fp-sidebar-item ${prop.id === selectedPropertyId ? "fp-sidebar-item--active" : ""}`}
              onClick={() => onSelectProperty(prop.id)}
            >
              <span className="fp-sidebar-item-icon">
                {Icon && <Icon style={{ width: 13, height: 13 }} />}
              </span>
              <span className="fp-sidebar-item-name">{prop.name}</span>
              {prop.id === selectedPropertyId && (
                <span className="fp-sidebar-item-return">⏎</span>
              )}
            </button>
          );
        })}

        <p className="fp-sidebar-group-label" style={{ marginTop: 10 }}>
          Built-ins
        </p>
        {BUILTIN_CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="fp-sidebar-category-label">{CATEGORY_LABELS[cat]}</p>
            {BUILTIN_FUNCTIONS.filter((f) => f.category === cat).map((fn) => (
              <button
                key={fn.name}
                className={`fp-sidebar-item ${selectedBuiltin?.name === fn.name ? "fp-sidebar-item--active" : ""}`}
                onClick={() => setSelectedBuiltin(fn)}
              >
                <span className="fp-sidebar-item-name fp-tok-fn">
                  {fn.name}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ── Right column: detail ── */}
      <div className="fp-sidebar-detail">
        {selectedProp && !selectedBuiltin && (
          <PropertyDetail prop={selectedProp} onInsert={onInsert} />
        )}
        {selectedBuiltin && (
          <BuiltinDetail fn={selectedBuiltin} onInsert={onInsert} />
        )}
        {!selectedProp && !selectedBuiltin && (
          <p className="fp-sidebar-hint">
            Select a property or function to see details.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Property detail ───────────────────────────────────────────────────────────

function PropertyDetail({
  prop,
  onInsert,
}: {
  prop: FormulaProperty;
  onInsert: (s: string) => void;
}) {
  const Icon = PROPERTY_TYPE_ICONS[prop.type];
  const snippets = [
    prop.name,
    `${prop.name}.style("b")`,
    `Full Name.split(" ").at(0)`,
  ];

  return (
    <div className="fp-detail">
      <div className="fp-detail-header">
        {Icon && (
          <Icon
            style={{ width: 15, height: 15 }}
            className="fp-sidebar-item-icon"
          />
        )}
        <span className="fp-detail-title">{prop.name}</span>
      </div>
      <p className="fp-detail-desc">Title property.</p>

      {snippets.map((s) => (
        <div key={s} className="fp-snippet-row">
          <code className="fp-snippet">
            <span className="fp-tok-prop">{prop.name}</span>
            {s !== prop.name && (
              <span className="fp-tok-op">{s.slice(prop.name.length)}</span>
            )}
          </code>
          <button
            className="fp-snippet-copy"
            onClick={() => onInsert(s)}
            aria-label="Copy"
          >
            <Copy style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Builtin detail ────────────────────────────────────────────────────────────

function BuiltinDetail({
  fn,
  onInsert,
}: {
  fn: BuiltinFunction;
  onInsert: (s: string) => void;
}) {
  return (
    <div className="fp-detail">
      <div className="fp-detail-header">
        <span className="fp-detail-title fp-tok-fn">{fn.name}</span>
      </div>
      <p className="fp-detail-desc">{fn.description}</p>
      <code className="fp-detail-sig">{fn.signature}</code>

      {fn.example && (
        <div className="fp-snippet-row" style={{ marginTop: 12 }}>
          <code className="fp-snippet">{fn.example}</code>
          <button
            className="fp-snippet-copy"
            onClick={() => onInsert(fn.example!)}
            aria-label="Insert"
          >
            <Copy style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}
    </div>
  );
}
