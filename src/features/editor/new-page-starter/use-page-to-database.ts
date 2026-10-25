import { useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { Page, ViewType } from "src/types";
import { newId } from "src/lib/id";
import { makeDataSource } from "src/utils/make-data-source";
import { makeDefaultView } from "src/utils/make-default-view";
import { useCreateDataSource } from "src/hooks/use-create-data-source";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as patchPageApi } from "src/api/pages";
import { useTranslation } from "react-i18next";
import { useToast } from "src/features/shell/toast";
import { pageBodyStart, RESTRUCTURE_META } from "./new-page-starter-extension";

// Turn THIS page into a database (a full-page one, like makeDatabasePage
// makes): a data source owned by the page, then the page body becomes the
// database block opened in the picked view. The page goes full width and, if
// it has no icon yet, gets the table icon.
//
// The source is created first, so a failure changes nothing. The doc edit
// carries RESTRUCTURE_META: by then the page already counts as a database
// page, and the structure guard takes the new [title, database] layout as its
// baseline instead of blocking it.
export function usePageToDatabase(editor: Editor, page: Page) {
  const createDataSource = useCreateDataSource();
  const patchPage = usePatchPage(({ id, patch }) => patchPageApi(id, patch));
  const busy = useRef(false);
  const { t } = useTranslation();
  const { show } = useToast();

  return useCallback(
    async (type: ViewType, viewName: string) => {
      if (busy.current) return;
      busy.current = true;
      try {
        const name =
          editor.state.doc.firstChild?.textContent.trim() ||
          page.title?.trim() ||
          "Untitled";
        const sourceId = newId();
        const source = makeDataSource({
          name,
          pageId: page.id,
          sourceId,
          viewType: type,
        });
        await createDataSource.mutateAsync(source);

        const at = pageBodyStart(editor.state.doc);
        if (at === null) return;
        const view = makeDefaultView(type, viewName, source.properties);
        const database = editor.schema.nodeFromJSON({
          type: "database",
          attrs: {
            id: newId(),
            sourceId,
            pageId: null,
            title: name,
            views: [view],
            activeViewId: view.id,
          },
        });
        const tr = editor.state.tr
          // + the trailing paragraph the editor keeps at the end anyway, so
          // the baseline already has it.
          .replaceWith(at, editor.state.doc.content.size, [
            database,
            editor.schema.nodes.paragraph.create(),
          ])
          .setMeta(RESTRUCTURE_META, true);
        editor.view.dispatch(tr);

        patchPage.mutate({
          id: page.id,
          patch: {
            settings: { ...page.settings, width: "full" },
            ...(page.cover.iconName
              ? {}
              : {
                  cover: { ...page.cover, iconName: "table", target: "Icons" },
                }),
          },
        });
      } catch (e) {
        console.error("turning the page into a database failed:", e);
        show(t("pageStarter.convertFailed"), "error");
      } finally {
        busy.current = false;
      }
    },
    [editor, page, createDataSource, patchPage, show, t],
  );
}
