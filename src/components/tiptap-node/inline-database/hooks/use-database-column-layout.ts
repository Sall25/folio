import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { DatabaseProperty, DatabaseView, DataSource } from "src/types";

interface Params {
  properties: DatabaseProperty[];
  activeView: DatabaseView | undefined;
  locked: boolean;
  tableRef: RefObject<HTMLDivElement | null>;
  updatePropertiesAsync: (
    properties: DatabaseProperty[],
  ) => Promise<DataSource>;
}

export function useDatabaseColumnLayout({
  properties,
  activeView,
  locked,
  tableRef,
  updatePropertiesAsync,
}: Params) {
  // Live draft widths during a resize drag (no network per tick).
  const [draftWidths, setDraftWidths] = useState<Record<string, number>>({});
  const lastCommitRef = useRef<{ propId: string; width: number } | null>(null);

  const hiddenProperties = activeView?.hiddenProperties;

  const visibleProperties = useMemo(() => {
    const hidden = new Set(hiddenProperties ?? []);
    return properties.filter((p) => !hidden.has(p.id));
  }, [properties, hiddenProperties]);

  const widthFor = useMemo(
    () => (p: DatabaseProperty) => draftWidths[p.id] ?? p.width ?? 160,
    [draftWidths],
  );

  // Header grid: property columns + trailing 1fr for the actions (+/...) cell.
  const gridTemplateColumns =
    visibleProperties.map((p) => `${widthFor(p)}px`).join(" ") + " 1fr";

  // Body grid: EXACTLY one column per property (no trailing 1fr — see note).
  const bodyGridTemplateColumns = visibleProperties
    .map((p) => `${widthFor(p)}px`)
    .join(" ");

  // Live resize: the resizer dispatches `column:resize` while dragging; update
  // the draft so both grids follow in real time.
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      if (locked) return;
      const { propId, width } = (e as CustomEvent).detail as {
        propId: string;
        width: number;
      };
      setDraftWidths((d) => ({ ...d, [propId]: width }));
    };
    el.addEventListener("column:resize", handler);
    return () => el.removeEventListener("column:resize", handler);
  }, [locked, tableRef]);

  // Persist the final width to the source, then drop the draft for that column.
  const commitColumnWidth = useCallback(
    async (ref: { current: HTMLElement | null } | undefined, width: number) => {
      if (locked) return;
      const propId = (ref?.current as HTMLElement | null)?.dataset.propId;
      if (!propId) return;

      const last = lastCommitRef.current;
      if (last && last.propId === propId && last.width === width) return;
      lastCommitRef.current = { propId, width };

      await updatePropertiesAsync(
        properties.map((p) => (p.id === propId ? { ...p, width } : p)),
      );

      setDraftWidths((d) => {
        if (!(propId in d)) return d;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [propId]: _drop, ...rest } = d;
        return rest;
      });
    },
    [locked, setDraftWidths, properties, updatePropertiesAsync],
  );

  return {
    draftWidths,
    visibleProperties,
    widthFor,
    gridTemplateColumns,
    bodyGridTemplateColumns,
    commitColumnWidth,
  };
}
