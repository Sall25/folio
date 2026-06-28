import { useMemo } from "react";
import type { PageCategory, PageTreeNode, ID, Page } from "src/types";
import { usePageTree } from "src/hooks/use-pages";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import {
  Breadcrumb,
  type BreadcrumbItem,
} from "src/components/tiptap-ui-primitive/breadcrumb/breadcrumb";

/**
 * App-layer wrapper around the <Breadcrumb> primitive. Derives the active
 * page's root → current chain from the page tree and wires navigation.
 *
 * NOTE: adjust the two context import paths to your project, and see the
 * `icon` line below to render page emojis/icons.
 */
export function PageBreadcrumb() {
  const { tree } = usePageTree();
  const { activePageId, setActivePageId } = useActivePage();

  const items: BreadcrumbItem[] = useMemo(() => {
    if (!tree || !activePageId) return [];

    // walk every category once, recording parent links + page objects
    const parentOf = new Map<ID, ID | null>();
    const pageOf = new Map<ID, Page>();
    const walk = (nodes: PageTreeNode[], parent: ID | null) => {
      for (const n of nodes) {
        parentOf.set(n.page.id, parent);
        pageOf.set(n.page.id, n.page);
        walk(n.children, n.page.id);
      }
    };
    (Object.keys(tree) as PageCategory[]).forEach((cat) =>
      walk(tree[cat] ?? [], null),
    );

    // climb from the active page up to the root
    const chain: Page[] = [];
    let cur: ID | null | undefined = activePageId;
    while (cur) {
      const p = pageOf.get(cur);
      if (!p) break;
      chain.unshift(p);
      cur = parentOf.get(cur) ?? null;
    }

    return chain.map((p) => ({
      id: p.id,
      title: p.title || "Untitled",

      // icon: <render p.<your-icon-field> here, e.g. an emoji or PageIcon />,
    }));
  }, [tree, activePageId]);

  if (items.length === 0) return null;

  return <Breadcrumb items={items} onNavigate={(id) => setActivePageId(id)} />;
}
