import { Bone } from "../../../../tiptap-ui-primitive/bone/bone";
import "./sidebar-skeleton.scss";

function RowSkeleton({
  labelWidth,
  indent = 0,
}: {
  labelWidth: number;
  indent?: number;
}) {
  return (
    <div className="es-sb-row" style={{ paddingLeft: 8 + indent }}>
      <Bone width={18} height={18} rounded />
      <Bone width={labelWidth} height={12} />
    </div>
  );
}

export const SidebarBodySkeleton: React.FC = () => (
  <div className="es-sb" role="presentation" aria-busy="true">
    {/* Recents */}
    <Bone width={52} height={10} className="es-sb-label" />
    <div className="es-sb-rows">
      {[120, 96, 78, 110, 70, 88, 64].map((w, i) => (
        <RowSkeleton key={i} labelWidth={w} />
      ))}
    </div>

    {/* New Page */}
    <div className="es-sb-row" style={{ paddingLeft: 8, marginTop: 4 }}>
      <Bone width={16} height={16} rounded />
      <Bone width={68} height={12} />
    </div>

    {/* Private section */}
    <Bone
      width={46}
      height={10}
      className="es-sb-label"
      style={{ marginTop: 20 }}
    />
    <div className="es-sb-rows">
      <RowSkeleton labelWidth={104} />
      <RowSkeleton labelWidth={82} />
    </div>

    {/* Favorites section label (empty under it, as in the shot) */}
    <Bone
      width={58}
      height={10}
      className="es-sb-label"
      style={{ marginTop: 20 }}
    />
  </div>
);
