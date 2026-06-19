import { Bone } from "../../../../tiptap-ui-primitive/bone/bone";
import "./toolbar-skeleton.scss";

interface ToolbarSkeletonProps {
  toolbarRef: React.RefObject<HTMLDivElement>;
}

export const ToolbarSkeleton: React.FC<ToolbarSkeletonProps> = ({
  toolbarRef,
}) => (
  <div ref={toolbarRef} className="es-toolbar" role="presentation">
    {/* Tabs */}
    <div className="es-tabs">
      <div className="es-tab">
        <Bone width={16} height={16} rounded />
        <Bone width={52} height={12} />
      </div>
      <div className="es-tab">
        <Bone width={16} height={16} rounded />
        <Bone width={62} height={12} />
        <Bone width={12} height={12} rounded />
      </div>
    </div>

    <div className="es-spacer" />

    {/* Right-hand controls */}
    <div className="es-btn-group">
      <Bone width={28} height={28} rounded />
      <Bone width={28} height={28} rounded />

      <div className="es-toolbar-sep" />

      <Bone width={28} height={28} rounded />
      <Bone width={28} height={28} rounded />
      <Bone width={28} height={28} rounded />

      <div className="es-toolbar-sep" />

      <Bone width={28} height={28} circle />
    </div>
  </div>
);
