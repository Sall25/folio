import { useMemo } from "react";

import type { GalleryView, Page } from "src/types";
import type { UseDatabaseReturn } from "./use-database";

export interface GalleryPlacement {
  order: number;
}

export interface GalleryLayout {
  placement: Record<string, GalleryPlacement>;
}

export function useGalleryLayout(
  sortedRecords: Page[],
  db: UseDatabaseReturn,
): { galleryLayout: GalleryLayout } {
  const activeView = db.activeView as GalleryView | undefined;
  const manualOrder = activeView?.manualOrder;

  const galleryLayout = useMemo<GalleryLayout>(() => {
    const recordIds = new Set(sortedRecords.map((record) => record.id));

    const orderedIds: string[] = [];
    const added = new Set<string>();

    // First, use the manually defined order.
    for (const id of manualOrder ?? []) {
      if (!recordIds.has(id) || added.has(id)) continue;

      orderedIds.push(id);
      added.add(id);
    }

    // Then append records that aren't present in manualOrder.
    for (const record of sortedRecords) {
      if (added.has(record.id)) continue;

      orderedIds.push(record.id);
      added.add(record.id);
    }

    const placement: Record<string, GalleryPlacement> = {};

    orderedIds.forEach((recordId, index) => {
      placement[recordId] = {
        order: index,
      };
    });

    return { placement };
  }, [sortedRecords, manualOrder]);

  return { galleryLayout };
}
