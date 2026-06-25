import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Page, PageCover, ID } from "src/types";
import { X, FileText, Plus } from "lucide-react";
import { PageItemIcon } from "../../page-item-icon";
import { useActivePage } from "../../context/active-page-context";
import { makePage } from "src/utils/make-page";
import { useCreatePage } from "src/hooks/use-create-page";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

// ── People metadata (display contract) ──────────────────────────────────────
// Page carries no author/usage data, so the parent supplies this from the real
// People domain. Minimal display shape — not a domain type.
export interface TemplatePerson {
  id?: string;
  name: string;
  avatarUrl?: string | null;
}
export interface TemplateMeta {
  createdBy?: TemplatePerson;
  usedBy?: TemplatePerson[];
  usedCount?: number;
}

interface TemplatesGalleryProps {
  open: boolean;
  templates: Page[];
  onClose: () => void;
  /** Supply creator + usage data per template from your People domain. */
  getTemplateMeta?: (template: Page) => TemplateMeta | undefined;
}

// Resolve a cover to a CSS background, honoring image > gradient > color.
function coverBackground(cover: PageCover | undefined): string {
  if (cover?.coverImage)
    return `center / cover no-repeat url(${cover.coverImage})`;
  if (cover?.gradient) return cover.gradient;
  if (cover?.color) return cover.color;
  return "var(--tt-hover-bg-color, rgba(0,0,0,0.04))";
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function Avatar({
  person,
  size = 28,
}: {
  person: TemplatePerson;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    border: "1.5px solid var(--tt-card-bg-color)",
    boxSizing: "border-box" as const,
  };
  if (person.avatarUrl) {
    return (
      <img
        src={person.avatarUrl}
        alt={person.name}
        style={{ ...common, objectFit: "cover" }}
      />
    );
  }
  return (
    <span
      title={person.name}
      style={{
        ...common,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--tt-hover-bg-color, rgba(0,0,0,0.06))",
        color: "var(--tt-text-color)",
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {initials(person.name)}
    </span>
  );
}

function AvatarStack({
  people,
  count,
  max = 4,
}: {
  people: TemplatePerson[];
  count: number;
  max?: number;
}) {
  if (count <= 0) {
    return (
      <span style={{ fontSize: 12, color: "var(--tt-text-color)" }}>
        Not used yet
      </span>
    );
  }
  const shown = people.slice(0, max);
  const extra = count - shown.length;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex" }}>
        {shown.map((p, i) => (
          <span key={p.id ?? i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <Avatar person={p} size={26} />
          </span>
        ))}
        {extra > 0 && (
          <span
            style={{
              marginLeft: -8,
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "1.5px solid var(--tt-card-bg-color)",
              background: "var(--tt-hover-bg-color, rgba(0,0,0,0.06))",
              color: "var(--tt-text-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 600,
              boxSizing: "border-box",
            }}
          >
            +{extra}
          </span>
        )}
      </div>
      <span style={{ fontSize: 12, color: "var(--tt-text-color)" }}>
        {count} {count === 1 ? "use" : "uses"}
      </span>
    </div>
  );
}

// Standalone launchable surface. Same portal/backdrop pattern as the delete
// dialog so the sidebar's overflow can't clip it.
export function TemplatesGallery({
  open,
  templates,
  onClose,
  getTemplateMeta,
}: TemplatesGalleryProps) {
  const createPage = useCreatePage();
  const { setActivePageId } = useActivePage();
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<ID | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? templates.filter((t) => (t.title || "").toLowerCase().includes(q))
    : templates;

  // Detail panel reflects the hovered card, falling back to the first result.
  const preview =
    filtered.find((t) => t.id === hoveredId) ?? filtered[0] ?? null;
  const meta =
    preview && getTemplateMeta ? getTemplateMeta(preview) : undefined;
  const usedBy = meta?.usedBy ?? [];
  const usedCount = meta?.usedCount ?? usedBy.length;

  const openTemplate = (id: ID) => {
    setActivePageId(id);
    onClose();
  };

  const createBlankTemplate = () => {
    const template = makePage({
      title: "New Template",
      parentId: null,
      category: "Template",
    });
    createPage.mutate(template);
    setActivePageId(template.id);
    onClose();
  };

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      className="sp-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 15, 15, 0.4)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "16vh",
        zIndex: 10000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Templates"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 900,
          maxWidth: "94vw",
          height: "70vh",
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--tt-card-bg-color)",
          border: "0.5px solid var(--tt-border-color)",
          borderRadius: "var(--tt-radius-lg)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "0.5px solid var(--tt-border-color)",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--tt-text-color)",
            }}
          >
            Templates
          </h2>
          <Spacer orientation="horizontal" />
          {/* <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              display: "flex",
              border: "none",
              background: "transparent",
              color: "var(--tt-text-color)",
              cursor: "pointer",
              padding: 4,
              borderRadius: "var(--tt-radius-sm)",
            }}
          >
            <X size={18} />
          </button> */}
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* ── Left: search + grid ───────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="sp-search"
              style={{ margin: 16, marginBottom: 12, flexShrink: 0 }}
            >
              <span className="sp-search__icon">
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                className="sp-search__input"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
              {filtered.length === 0 && q ? (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--tt-text-color)",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  No templates match "{query}".
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(170px, 1fr))",
                    gap: 12,
                  }}
                >
                  {/* Blank tile — first cell, matches card dimensions */}
                  {!q && (
                    <button
                      type="button"
                      onClick={createBlankTemplate}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        border: "1px dashed var(--tt-border-color)",
                        borderRadius: "var(--tt-radius-md)",
                        background: "transparent",
                        cursor: "pointer",
                        padding: 0,
                        transition: "border-color 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor =
                          "var(--tt-brand-color-500)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor =
                          "var(--tt-border-color)")
                      }
                    >
                      <div
                        style={{
                          height: 80,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--tt-text-color)",
                        }}
                      >
                        <Plus size={22} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <FileText
                          size={16}
                          style={{ color: "var(--tt-text-color)" }}
                        />
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "var(--tt-text-color)",
                          }}
                        >
                          Blank template
                        </span>
                      </div>
                    </button>
                  )}

                  {filtered.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onMouseEnter={() => setHoveredId(template.id)}
                      onClick={() => openTemplate(template.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        border:
                          preview?.id === template.id
                            ? "1px solid var(--tt-brand-color-500)"
                            : "1px solid var(--tt-border-color)",
                        borderRadius: "var(--tt-radius-md)",
                        background: "var(--tt-card-bg-color)",
                        cursor: "pointer",
                        padding: 0,
                        transition: "border-color 0.12s",
                      }}
                    >
                      <div
                        style={{
                          height: 80,
                          background: coverBackground(template.cover),
                          borderBottom: "0.5px solid var(--tt-border-color)",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <PageItemIcon cover={template.cover} />
                        <span
                          style={{
                            fontSize: 14,
                            color: "var(--tt-text-color)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {template.title || "Untitled"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filtered.length === 0 && !q && (
                <div
                  style={{
                    padding: "16px 4px 0",
                    color: "var(--tt-text-color)",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  Save any page as a template, or start one from the blank tile.
                </div>
              )}
            </div>
          </div>

          {/* ── Right: hover detail panel ─────────────────────────────────── */}
          <div
            style={{
              width: 300,
              flexShrink: 0,
              borderLeft: "0.5px solid var(--tt-border-color)",
              background: "var(--tt-hover-bg-color, rgba(0,0,0,0.015))",
              overflowY: "auto",
            }}
          >
            {preview ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    height: 120,
                    background: coverBackground(preview.cover),
                    borderBottom: "0.5px solid var(--tt-border-color)",
                  }}
                />
                <div
                  style={{
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <PageItemIcon cover={preview.cover} />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--tt-text-color)",
                      }}
                    >
                      {preview.title || "Untitled"}
                    </span>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "var(--tt-text-color)",
                        marginBottom: 8,
                      }}
                    >
                      Created by
                    </div>
                    {meta?.createdBy ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Avatar person={meta.createdBy} size={26} />
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--tt-text-color)",
                          }}
                        >
                          {meta.createdBy.name}
                        </span>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--tt-text-color)",
                        }}
                      >
                        Unknown
                      </span>
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "var(--tt-text-color)",
                        marginBottom: 8,
                      }}
                    >
                      Used by
                    </div>
                    <AvatarStack people={usedBy} count={usedCount} />
                  </div>

                  <button
                    type="button"
                    onClick={() => openTemplate(preview.id)}
                    style={{
                      marginTop: 4,
                      padding: "8px 12px",
                      borderRadius: "var(--tt-radius-md)",
                      border: "none",
                      background: "var(--tt-brand-color-500)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Open template
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 24,
                  fontSize: 13,
                  color: "var(--tt-text-color)",
                  lineHeight: 1.5,
                }}
              >
                Hover a template to see details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
