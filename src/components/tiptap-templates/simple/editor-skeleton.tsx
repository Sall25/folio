import React from "react";

// ============================================================
// Styles — injected once via a singleton <style> tag
// ============================================================

const STYLE_ID = "editor-skeleton-styles";

const css = `
@keyframes editor-skeleton-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}

.es-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-background-primary, #ffffff);
}

/* ── Toolbar ── */
.es-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 48px;
  flex-shrink: 0;
  border-bottom: 0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12));
  box-sizing: border-box;
}

.es-spacer { flex: 1; }

.es-toolbar-sep {
  width: 0.5px;
  height: 18px;
  background: var(--color-border-tertiary, rgba(0,0,0,0.12));
  flex-shrink: 0;
  margin: 0 2px;
}

.es-breadcrumb {
  display: flex;
  align-items: center;
  gap: 5px;
}

.es-chevron {
  font-size: 11px;
  color: var(--color-text-tertiary, rgba(0,0,0,0.3));
  line-height: 1;
  user-select: none;
}

.es-btn-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── Shimmer bone ── */
.es-bone {
  display: inline-block;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--color-background-secondary, #f4f4f2) 25%,
    var(--color-background-tertiary,  #eceae6) 50%,
    var(--color-background-secondary, #f4f4f2) 75%
  );
  background-size: 600px 100%;
  animation: editor-skeleton-shimmer 1.6s infinite linear;
  flex-shrink: 0;
}

/* shape helpers */
.es-bone-circle  { border-radius: 50% !important; }
.es-bone-pill    { border-radius: 999px !important; }
.es-bone-rounded { border-radius: 6px !important; }

/* ── Content area ── */
.es-content {
  flex: 1;
  overflow: hidden;
  padding: 56px 96px 48px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .es-content {
    padding: 40px 24px 40px;
  }
}

.es-block   { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
.es-inline  { display: flex; align-items: center; gap: 10px; }
.es-callout {
  background: var(--color-background-secondary, #f4f4f2);
  border: 0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12));
  border-radius: 6px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}
`;

function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

// ============================================================
// Primitive — a single shimmer bone
// ============================================================

interface BoneProps {
  width: number | string;
  height: number | string;
  circle?: boolean;
  pill?: boolean;
  rounded?: boolean;
  style?: React.CSSProperties;
}

const Bone: React.FC<BoneProps> = ({
  width,
  height,
  circle,
  pill,
  rounded,
  style,
}) => {
  const cls = [
    "es-bone",
    circle ? "es-bone-circle" : "",
    pill ? "es-bone-pill" : "",
    rounded ? "es-bone-rounded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={cls}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
};

// ============================================================
// Sub-sections
// ============================================================

const ToolbarSkeleton: React.FC = () => (
  <div className="es-toolbar" role="presentation">
    {/* Breadcrumb */}
    <div className="es-breadcrumb">
      <Bone width={22} height={22} circle />
      <Bone width={68} height={12} />
      <span className="es-chevron">›</span>
      <Bone width={84} height={12} />
      <span className="es-chevron">›</span>
      <Bone width={58} height={12} />
    </div>

    <div className="es-spacer" />

    {/* Right-hand controls */}
    <div className="es-btn-group">
      {/* Undo / Redo */}
      <Bone width={28} height={28} rounded />
      <Bone width={28} height={28} rounded />

      <div className="es-toolbar-sep" />

      {/* Theme, notification, more, avatar */}
      <Bone width={28} height={28} rounded />
      <Bone width={28} height={28} rounded />
      <Bone width={28} height={28} rounded />

      <div className="es-toolbar-sep" />

      <Bone width={28} height={28} circle />
    </div>
  </div>
);

const ContentSkeleton: React.FC = () => (
  <div className="es-content" role="presentation">
    {/* Page emoji / cover icon */}
    <Bone width={52} height={52} rounded style={{ marginBottom: 20 }} />

    {/* Title */}
    <Bone width="52%" height={40} rounded style={{ marginBottom: 32 }} />

    {/* Paragraph 1 */}
    <div className="es-block">
      <Bone width="100%" height={14} />
      <Bone width="96%" height={14} />
      <Bone width="81%" height={14} />
    </div>

    {/* Bulleted list */}
    <div className="es-block">
      {([180, 220, 155] as const).map((w, i) => (
        <div key={i} className="es-inline">
          <Bone width={16} height={16} rounded />
          <Bone width={w} height={13} />
        </div>
      ))}
    </div>

    {/* Paragraph 2 */}
    <div className="es-block">
      <Bone width="100%" height={14} />
      <Bone width="91%" height={14} />
      <Bone width="76%" height={14} />
      <Bone width="100%" height={14} />
      <Bone width="63%" height={14} />
    </div>

    {/* Callout block */}
    <div className="es-callout">
      <Bone width="38%" height={13} />
      <Bone width="100%" height={13} />
      <Bone width="84%" height={13} />
    </div>

    {/* Paragraph 3 */}
    <div className="es-block">
      <Bone width="100%" height={14} />
      <Bone width="71%" height={14} />
    </div>

    {/* Numbered list */}
    <div className="es-block">
      {([200, 175, 240] as const).map((w, i) => (
        <div key={i} className="es-inline">
          <Bone width={18} height={13} pill />
          <Bone width={w} height={13} />
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// Public component
// ============================================================

export interface EditorSkeletonProps {
  /** Pass the same ref you use for the real toolbar so layout stays consistent. */
  toolbarRef?: React.RefObject<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
}

export const EditorSkeleton: React.FC<EditorSkeletonProps> = ({
  toolbarRef,
  className,
  style,
}) => {
  injectStyles();

  return (
    <div
      className={["es-root", className].filter(Boolean).join(" ")}
      style={style}
      aria-label="Loading editor…"
      aria-busy="true"
      role="status"
    >
      <div ref={toolbarRef}>
        <ToolbarSkeleton />
      </div>
      <ContentSkeleton />
    </div>
  );
};

export default EditorSkeleton;
