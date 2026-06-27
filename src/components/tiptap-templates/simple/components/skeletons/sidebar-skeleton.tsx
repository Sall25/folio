import { SectionSkeleton } from "./section-skeleton";
import "./sidebar-skeleton.scss";

export const SidebarBodySkeleton: React.FC = () => (
  <div className="sidebar-skeleton" role="presentation" aria-busy="true">
    {/* Recents */}
    <SectionSkeleton labelWidth={52} rows={[120, 96, 78, 110, 70, 88, 64]} />
    {/* Private */}
    <SectionSkeleton labelWidth={46} rows={[104, 82]} />
    {/* Favorites — label only, empty */}
    <SectionSkeleton labelWidth={58} rows={0} />
  </div>
);
