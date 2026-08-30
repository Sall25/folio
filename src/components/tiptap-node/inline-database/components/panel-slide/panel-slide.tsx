import { useState } from "react";
import type { ReactNode } from "react";
import "./panel-slide.scss";

// ─── PanelSlide ─────────────────────────────────────────────────────────────
// Wraps a swapping panel body and replays a slide-in whenever the panel key
// changes. View-options is main ↔ one sub-panel (no deeper nesting), so
// direction is inferred from the key alone:
//   - entering a sub-panel (main → X)  → slide in from the RIGHT (forward)
//   - returning to main   (X → main)   → slide in from the LEFT  (back)
// Pure CSS (a keyframe replayed via a changing React key); no library, no stack.
export function PanelSlide({
  panelKey,
  children,
}: {
  /** Current panel key (e.g. panel.type). "main" is treated as the root. */
  panelKey: string;
  children: ReactNode;
}) {
  const [prevKey, setPrevKey] = useState(panelKey);
  const [dir, setDir] = useState<"forward" | "back">("forward");

  if (prevKey !== panelKey) {
    // Going TO main = back; going away from main (into a sub-panel) = forward.
    setDir(panelKey === "main" ? "back" : "forward");
    setPrevKey(panelKey);
  }

  return (
    <div key={panelKey} className="panel-slide" data-dir={dir}>
      {children}
    </div>
  );
}
