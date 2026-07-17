import { Bone } from "../../../../tiptap-ui-primitive/bone/bone";
import "./editor-content-skeleton.scss";

/**
 * Body-only skeleton. The cover band and page icon are deliberately absent:
 * CoverHeader reads page.cover from the Page record (not the Y.Doc), so it
 * renders its real self during the sync gap — no placeholder needed, and a
 * Bone here would just cover the real thing.
 */
export const EditorContentSkeleton: React.FC = () => (
  <div className="es-content-col">
    {/* Add cover / Comment affordances */}
    <div className="es-content-affordances">
      <Bone width={84} height={12} />
      <Bone width={74} height={12} />
    </div>

    {/* Title */}
    <Bone width="52%" height={40} rounded className="es-title" />

    {/* Body — enough lines to fill the column height */}
    <div className="es-content-body">
      <Bone width="100%" height={15} />
      <Bone width="97%" height={15} />
      <Bone width="90%" height={15} />
      <Bone width="64%" height={15} />

      <Bone width="100%" height={15} style={{ marginTop: 16 }} />
      <Bone width="95%" height={15} />
      <Bone width="98%" height={15} />
      <Bone width="72%" height={15} />

      <Bone width="100%" height={15} style={{ marginTop: 16 }} />
      <Bone width="88%" height={15} />
      <Bone width="55%" height={15} />
    </div>
  </div>
);
