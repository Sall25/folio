import { EditorContentSkeleton } from "./editor-content-skeleton";
import "./editor-content-skeleton-full.scss";

/**
 * Positioned wrapper around EditorContentSkeleton. Handles ONLY placement —
 * overlaying the content area with the same margin/width/translate logic as
 * the real editor shell (StableShell) — and delegates the actual skeleton
 * visual to EditorContentSkeleton so there's a single source of truth for
 * what the loading state looks like.
 *
 * Shown during the collab-sync gap on page switch.
 */
export function EditorContentSkeletonFull() {

  return (
    <div className="es-content" role="presentation">
      <EditorContentSkeleton />
    </div>
  );
}
