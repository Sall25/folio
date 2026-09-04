import type { DatabaseProperty } from "src/types";

export function TableSkeletonRow({
  visibleProperties,
  gridTemplateColumns,
}: {
  visibleProperties: DatabaseProperty[];
  gridTemplateColumns: string;
}) {
  return (
    <div
      className="db-skeleton-row"
      contentEditable={false}
      style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns }}
    >
      {visibleProperties.map((prop) => (
        <div key={prop.id} className="db-skeleton-cell">
          <span className="db-skeleton-bar" />
        </div>
      ))}
      <div className="db-skeleton-cell" />
    </div>
  );
}
