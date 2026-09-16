import type { DatabaseView } from "src/types";
import { DatabaseLoadingSkeleton } from "../database-loading-skeleton";
import { useViewSkeletonDims } from "../../hooks";

export function DatabaseLoadingSkeletonWithDims({
  databaseId,
  type = "table",
  switching = false,
}: {
  databaseId: string;
  type: DatabaseView["type"];
  switching?: boolean;
}) {
  const { dims } = useViewSkeletonDims(databaseId, type);
  return (
    <DatabaseLoadingSkeleton
      type={type}
      rows={dims.rows}
      columns={dims.columns}
      switching={switching}
    />
  );
}
