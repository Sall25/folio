import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { FormulaPreviewResult, FormulaProperty } from "./types";

interface FormulaPreviewProps {
  result: FormulaPreviewResult;
  properties: FormulaProperty[];
  previewPropertyId: string;
  onPreviewPropertyChange: (id: string) => void;
  debugMode: boolean;
  onDebugModeChange: (v: boolean) => void;
}

export function FormulaPreview({
  result,
  properties,
  previewPropertyId,
  onPreviewPropertyChange,
  debugMode,
  onDebugModeChange,
}: FormulaPreviewProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const previewProp =
    properties.find((p) => p.id === previewPropertyId) ?? properties[0];

  return (
    <div className="fp-preview-wrap">
      {/* Top bar */}
      <div className="fp-preview-bar">
        <span className="fp-preview-label">Preview with</span>

        {/* Property picker */}
        <div className="fp-preview-picker" style={{ position: "relative" }}>
          <button
            className="fp-preview-picker-btn"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <FileText style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span className="fp-preview-picker-name">
              @{previewProp?.name ?? "—"}
            </span>
            <ChevronDown style={{ width: 11, height: 11, flexShrink: 0 }} />
          </button>

          {dropdownOpen && (
            <div className="fp-preview-dropdown">
              {properties.map((p) => (
                <button
                  key={p.id}
                  className={`fp-preview-dropdown-item ${p.id === previewPropertyId ? "fp-preview-dropdown-item--active" : ""}`}
                  onClick={() => {
                    onPreviewPropertyChange(p.id);
                    setDropdownOpen(false);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={{ flex: 1 }} />

        {/* Debug toggle */}
        <span className="fp-preview-label">Debug mode</span>
        <button
          role="switch"
          aria-checked={debugMode}
          className={`fp-toggle ${debugMode ? "fp-toggle--on" : ""}`}
          onClick={() => onDebugModeChange(!debugMode)}
        >
          <span className="fp-toggle-thumb" />
        </button>
      </div>

      {/* Output row */}
      <div className="fp-output-row">
        <span
          className={`fp-output-value ${result.error ? "fp-output-value--error" : ""}`}
        >
          {result.error
            ? result.error
            : result.output !== null
              ? result.output
              : "No output"}
        </span>

        <span className="fp-type-badge">Type: {result.type}</span>
      </div>

      {/* Debug panel */}
      {debugMode && (
        <div className="fp-debug">
          <p className="fp-debug-label">Evaluation context</p>
          {properties.map((p) => (
            <div key={p.id} className="fp-debug-row">
              <span className="fp-debug-prop">{p.name}</span>
              <span className="fp-debug-type">{p.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
