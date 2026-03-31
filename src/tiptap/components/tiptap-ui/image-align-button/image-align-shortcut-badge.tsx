
import type { AlignValue } from "./types";
import { ALIGN_CONFIG } from "./config";

// ─── ImageAlignShortcutBadge ──────────────────────────────────────────────────

export const ImageAlignShortcutBadge: React.FC<{ align: AlignValue }> = ({ align }) => (
  <kbd style={{
    fontSize: "10px",
    fontFamily: "monospace",
    background: "rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: "4px",
    padding: "1px 5px",
    color: "inherit",
    opacity: 0.7,
  }}>
    {ALIGN_CONFIG[align].shortcut}
  </kbd>
);
