import type { Page } from "src/types";
import { FileText, Plus } from "lucide-react";
import { PageItemIcon } from "../../page-item-icon";

interface TemplatePickerProps {
  templates: Page[];
  onUseBlank: () => void;
  onUseTemplate: (template: Page) => void;
}

// Shown in the editor body when a page is empty — Notion's inline start state.
export function TemplatePicker({
  templates,
  onUseBlank,
  onUseTemplate,
}: TemplatePickerProps) {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "8px 0",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--tt-theme-muted)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Get started
      </span>

      <button
        type="button"
        onClick={onUseBlank}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--tt-border-color)",
          borderRadius: "var(--tt-radius-md)",
          background: "var(--tt-card-bg-color)",
          color: "var(--tt-text-color)",
          fontSize: 14,
          cursor: "pointer",
          transition: "border-color 0.12s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "var(--tt-brand-color-500)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "var(--tt-border-color)")
        }
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--tt-theme-muted)",
          }}
        >
          <FileText size={18} />
        </span>
        <span style={{ fontWeight: 500 }}>Blank page</span>
        <Plus
          size={16}
          style={{ marginLeft: "auto", color: "var(--tt-theme-muted)" }}
        />
      </button>

      {templates.length > 0 && (
        <>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--tt-theme-muted)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            Templates
          </span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onUseTemplate(template)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid var(--tt-border-color)",
                  borderRadius: "var(--tt-radius-md)",
                  background: "var(--tt-card-bg-color)",
                  color: "var(--tt-text-color)",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor =
                    "var(--tt-brand-color-500)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--tt-border-color)")
                }
              >
                <PageItemIcon cover={template.cover} />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {template.title || "Untitled"}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
