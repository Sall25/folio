import { useState, useCallback } from "react";
import { X, HelpCircle } from "lucide-react";

import type { FormulaPropertyProps } from "./types";
import { DEFAULT_PROPERTIES } from "./config";
import { evaluateFormula } from "./formula-evaluator";
import { FormulaAIInput } from "./formula-input";
import { FormulaEditor } from "./formula-editor";
import { FormulaPreview } from "./formula-preview";
import { FormulaSidebar } from "./formula-sidebar";

import "./formula-property.scss";

export function FormulaPropertyEdit({
  properties: externalProps,
  formula: initialFormula = "",
  onChange,
  onClose,
}: FormulaPropertyProps) {
  const properties = externalProps ?? DEFAULT_PROPERTIES;

  const [formula, setFormula] = useState(initialFormula);
  const [previewPropertyId, setPreviewPropertyId] = useState(
    properties[0]?.id ?? "",
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    properties[0]?.id ?? null,
  );
  const [debugMode, setDebugMode] = useState(false);

  const result = evaluateFormula(formula, properties);

  const handleInsert = useCallback((text: string) => {
    setFormula((prev) => prev + text);
  }, []);

  const handlePropertySelect = (id: string) => {
    setSelectedPropertyId(id);
    handleInsert(properties.find((p) => p.id === id)?.name ?? "");
  };

  const handleSave = () => {
    onChange?.(formula);
    onClose?.();
  };

  return (
    <div className="fp-root">
      {/* ── Header ── */}
      <div className="fp-header">
        <span className="fp-header-title">Edit formula</span>
        <button className="fp-header-help" aria-label="Help">
          <HelpCircle style={{ width: 15, height: 15 }} />
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="fp-header-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* ── AI input ── */}
      <FormulaAIInput currentFormula={formula} onResult={setFormula} />

      {/* ── Formula editor ── */}
      <FormulaEditor
        value={formula}
        onChange={setFormula}
        hasError={!!result.error}
      />

      {/* ── Preview ── */}
      <FormulaPreview
        result={result}
        properties={properties}
        previewPropertyId={previewPropertyId}
        onPreviewPropertyChange={setPreviewPropertyId}
        debugMode={debugMode}
        onDebugModeChange={setDebugMode}
      />

      {/* ── Sidebar (Properties + Built-ins) ── */}
      <FormulaSidebar
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={handlePropertySelect}
        onInsert={handleInsert}
      />

      {/* ── Footer ── */}
      <div className="fp-footer">
        <button className="fp-btn fp-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="fp-btn fp-btn--primary" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}
