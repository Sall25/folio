import { useCallback } from "react";
import { useCreatePage } from "src/hooks/use-create-page";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { makePage } from "src/utils/make-page";
import { makePageFromTemplate } from "src/utils/make-page";
import type { Page, PageCategory, ID } from "src/types";

// Shared create actions for both template surfaces (empty-state picker and
// gallery). Defaults to a top-level Private page; pass parentId/category to
// create elsewhere (e.g. inside a section or under a parent page).
export function useCreateFromTemplate(defaults?: {
  parentId?: ID | null;
  category?: PageCategory;
}) {
  const createPage = useCreatePage();
  const { setActivePageId } = useActivePage();

  const parentId = defaults?.parentId ?? null;
  const category = defaults?.category ?? "Private";

  const createBlank = useCallback(() => {
    const page = makePage({ title: "New Page", parentId, category });
    createPage.mutate(page);
    setActivePageId(page.id);
    return page.id;
  }, [createPage, setActivePageId, parentId, category]);

  const createFromTemplate = useCallback(
    (template: Page) => {
      const page = makePageFromTemplate(template, { parentId, category });
      createPage.mutate(page);
      setActivePageId(page.id);
      return page.id;
    },
    [createPage, setActivePageId, parentId, category],
  );

  return { createBlank, createFromTemplate };
}
