import { useCallback, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import type {
  DatabaseAttrs,
  DatabaseRow,
  Filter,
  FilterOperator,
  Property,
  Sort,
  SortDirection,
} from "./types";

interface UseDatabaseOptions {
  attrs: DatabaseAttrs;
  onUpdate: (patch: Partial<DatabaseAttrs>) => void;
}

export function useDatabase({ attrs, onUpdate }: UseDatabaseOptions) {
  const { rows, properties, sorts, filters, groupBy } = attrs;

  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  // ─── derived data ────────────────────────────────────────────────────

  const processed = useMemo(() => {
    let data = [...rows];

    // search
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((r) =>
        properties.some((p) =>
          String(r[p.id] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }

    // filters
    data = data.filter((r) =>
      filters.every((f) => {
        const val = String(r[f.prop] ?? "").toLowerCase();
        switch (f.op as FilterOperator) {
          case "contains":
            return val.includes(f.val.toLowerCase());
          case "is":
            return val === f.val.toLowerCase();
          case "is_not":
            return val !== f.val.toLowerCase();
          case "is_empty":
            return val === "";
          case "is_not_empty":
            return val !== "";
          default:
            return true;
        }
      }),
    );

    // sorts
    if (sorts.length) {
      data.sort((a, b) => {
        for (const s of sorts) {
          const av = String(a[s.prop] ?? "");
          const bv = String(b[s.prop] ?? "");
          const cmp = av.localeCompare(bv) * (s.dir === "asc" ? 1 : -1);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    return data;
  }, [rows, properties, sorts, filters, search]);

  const grouped = useMemo(() => {
    if (!groupBy) return { "": { label: "", rows: processed } };
    const map: Record<string, { label: string; rows: DatabaseRow[] }> = {};
    processed.forEach((r) => {
      const key = String(r[groupBy] ?? "(empty)");
      if (!map[key]) map[key] = { label: key, rows: [] };
      map[key].rows.push(r);
    });
    return map;
  }, [processed, groupBy]);

  // ─── row actions ────────────────────────────────────────────────────

  const addRow = useCallback(() => {
    const blank: DatabaseRow = { id: nanoid(), name: "Untitled" };
    properties.forEach((p) => {
      if (!blank[p.id]) blank[p.id] = "";
    });
    onUpdate({ rows: [...rows, blank] });
  }, [rows, properties, onUpdate]);

  const updateRow = useCallback(
    (id: string, prop: string, value: string | number | boolean) => {
      onUpdate({
        rows: rows.map((r) => (r.id === id ? { ...r, [prop]: value } : r)),
      });
    },
    [rows, onUpdate],
  );

  const deleteRow = useCallback(
    (id: string) => {
      onUpdate({ rows: rows.filter((r) => r.id !== id) });
    },
    [rows, onUpdate],
  );

  // ─── sort actions ───────────────────────────────────────────────────

  const toggleSort = useCallback(
    (prop: string) => {
      const idx = sorts.findIndex((s) => s.prop === prop);
      let next: Sort[];
      if (idx >= 0) {
        if (sorts[idx].dir === "asc") {
          next = sorts.map((s, i) =>
            i === idx ? { ...s, dir: "desc" as SortDirection } : s,
          );
        } else {
          next = sorts.filter((_, i) => i !== idx);
        }
      } else {
        next = [...sorts, { prop, dir: "asc" }];
      }
      onUpdate({ sorts: next });
    },
    [sorts, onUpdate],
  );

  const addSort = useCallback(() => {
    const unused = properties.find((p) => !sorts.some((s) => s.prop === p.id));
    if (!unused) return;
    onUpdate({ sorts: [...sorts, { prop: unused.id, dir: "asc" }] });
  }, [sorts, properties, onUpdate]);

  const updateSort = useCallback(
    (idx: number, patch: Partial<Sort>) => {
      onUpdate({
        sorts: sorts.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
      });
    },
    [sorts, onUpdate],
  );

  const removeSort = useCallback(
    (idx: number) => {
      onUpdate({ sorts: sorts.filter((_, i) => i !== idx) });
    },
    [sorts, onUpdate],
  );

  // ─── filter actions ─────────────────────────────────────────────────

  const addFilter = useCallback(() => {
    const f: Filter = {
      id: nanoid(),
      prop: properties[0]?.id ?? "name",
      op: "contains",
      val: "",
    };
    onUpdate({ filters: [...filters, f] });
  }, [filters, properties, onUpdate]);

  const updateFilter = useCallback(
    (id: string, patch: Partial<Filter>) => {
      onUpdate({
        filters: filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      });
    },
    [filters, onUpdate],
  );

  const removeFilter = useCallback(
    (id: string) => {
      onUpdate({ filters: filters.filter((f) => f.id !== id) });
    },
    [filters, onUpdate],
  );

  // ─── property actions ────────────────────────────────────────────────

  const togglePropertyVisible = useCallback(
    (id: string) => {
      onUpdate({
        properties: properties.map((p) =>
          p.id === id ? { ...p, visible: !p.visible } : p,
        ),
      });
    },
    [properties, onUpdate],
  );

  const addProperty = useCallback(
    (prop: Omit<Property, "id" | "visible">) => {
      const newProp: Property = { ...prop, id: nanoid(), visible: true };
      onUpdate({ properties: [...properties, newProp] });
    },
    [properties, onUpdate],
  );

  // ─── group actions ───────────────────────────────────────────────────

  const setGroupBy = useCallback(
    (prop: string | null) => {
      setCollapsedGroups({});
      onUpdate({ groupBy: prop });
    },
    [onUpdate],
  );

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    // data
    processed,
    grouped,
    collapsedGroups,
    search,
    setSearch,
    // row
    addRow,
    updateRow,
    deleteRow,
    // sort
    toggleSort,
    addSort,
    updateSort,
    removeSort,
    // filter
    addFilter,
    updateFilter,
    removeFilter,
    // property
    togglePropertyVisible,
    addProperty,
    // group
    setGroupBy,
    toggleGroup,
  };
}
