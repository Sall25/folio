// ─── Move to (destination picker) ───────────────────────────────────────────
// A within-popover panel that lets the user move a record's PAGE under another
// page (reparent). Self-contained: it reads the page list from usePages() and
// performs the move via patchPageAsync (parentId + category), the same mutation
// the sidebar's drag-to-reparent uses.
//
// This first version is a searchable FLAT list of destinations (search a page,
// pick it). The image's expandable tree-drill (move INTO a page's subtree via
// the `>` chevrons) and the space switcher are deferred enhancements — the flat
// search covers the common case (find the destination, move).
import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { usePages } from "src/hooks/use-pages";
import type { ID, Page } from "src/types";

interface MoveToPanelProps {
  /** The record's page — the thing being moved (excluded from destinations,
   *  along with its own descendants). */
  currentPageId: ID;
  /** Perform the move. The composer wires this to patchPageAsync (parentId +
   *  category). newParentId null = move to a top-level section. */
  onMove: (newParentId: ID | null, category?: string) => void;
  onBack: () => void;
  spaceName?: string;
}

// Collect a page and all of its descendants — a page can't be moved into its
// own subtree, so these are excluded from the destination list.
function collectSubtreeIds(rootId: ID, pages: Page[]): Set<ID> {
  const childrenOf = new Map<ID | null, Page[]>();
  for (const p of pages) {
    const key = (p.parentId ?? null) as ID | null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(p);
    childrenOf.set(key, arr);
  }
  const ids = new Set<ID>([rootId]);
  const stack: ID[] = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of childrenOf.get(id) ?? []) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return ids;
}

export function MoveToPanel({
  currentPageId,
  onMove,
  onBack,
  spaceName,
}: MoveToPanelProps) {
  const { data: pages } = usePages();
  const [query, setQuery] = useState("");

  const excluded = useMemo(
    () => collectSubtreeIds(currentPageId, pages ?? []),
    [currentPageId, pages],
  );

  const destinations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (pages ?? [])
      .filter((p) => !excluded.has(p.id))
      .filter((p) => (q ? (p.title ?? "").toLowerCase().includes(q) : true));
  }, [pages, excluded, query]);

  return (
    <Card className="db-actions-menu db-move-to">
      <CardHeader>
        <Button
          variant="ghost"
          onClick={onBack}
          style={{ background: "transparent" }}
        >
          <ChevronLeft size={16} className="tiptap-button-icon" />
        </Button>
        <div className="db-move-to__search">
          <Search size={14} className="tiptap-button-icon" />
          <Input
            autoFocus
            value={query}
            placeholder="Move page to..."
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardBody style={{ width: "100%" }}>
        <CardGroupLabel>{query ? "Results" : "Suggested"}</CardGroupLabel>
        <CardItemGroup>
          {destinations.map((p) => (
            <Button
              key={p.id}
              variant="ghost"
              className="db-move-to__row"
              style={{ justifyContent: "flex-start", width: "100%" }}
              onClick={() => onMove(p.id, p.category)}
            >
              <DynamicIcon name={p.cover?.iconName ?? "file-text"} size={16} />
              <span className="tiptap-button-text">
                {p.title || "Untitled"}
              </span>
            </Button>
          ))}
          {destinations.length === 0 && (
            <span className="db-panel__empty">No destinations</span>
          )}
        </CardItemGroup>
      </CardBody>

      {spaceName && (
        <div className="db-move-to__footer">
          <span className="tiptap-button-text">{spaceName}</span>
        </div>
      )}
    </Card>
  );
}
