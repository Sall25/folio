import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { FileText, Table2 } from "src/components/icons";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DropdownMenuItem } from "src/components/tiptap-ui-primitive/dropdown-menu";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { useDataSource, useDataSources } from "src/hooks/use-data-sources";
import { usePage } from "src/hooks/use-pages";
import { getSelectedBlocks } from "src/lib/block-selection";
import { newId } from "src/lib/id";
import { makeDefaultView } from "src/utils/make-default-view";
import type { DataSource, DatabaseView, ID, Page } from "src/types";

// A database block and its own page are two ways of showing one database:
// inline, on the page that holds it, or as a link to the page it lives on
// (every database has one, a child of the page it was made in). These two
// menu items swap one for the other. The data, rows and page stay where they
// are; only the block changes.
//
//   database block → "Turn into page"   → a page link to its database page
//   page link      → "Turn into inline" → the database, shown here again
//
// Read when the block menu opens (it renders on open), so no editor listener.

type Picked = { node: PMNode; pos: number };

/** The one block the drag handle selected, if it's one block. */
function pickedBlock(editor: Editor): Picked | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    return { node: selection.node, pos: selection.from };
  }
  const blocks = getSelectedBlocks(selection);
  return blocks?.length === 1 ? blocks[0] : null;
}

/** Inside a table cell, where a database can't go. */
function inTableCell(editor: Editor, pos: number): boolean {
  const $pos = editor.state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    const name = $pos.node(d).type.name;
    if (name === "tableCell" || name === "tableHeader") return true;
  }
  return false;
}

/** The views the database page shows its database with, from the page's
 *  saved content, given new ids so the two blocks don't share them. */
function viewsFromPage(
  page: Page | null | undefined,
  source: DataSource,
): { views: DatabaseView[]; activeViewId: ID | null } {
  const blocks = (page?.content?.content ?? []) as {
    type?: string;
    attrs?: Record<string, unknown>;
  }[];
  const block = blocks.find(
    (b) => b.type === "database" && b.attrs?.sourceId === source.id,
  );
  const saved = (block?.attrs?.views ?? []) as DatabaseView[];
  if (saved.length === 0) {
    const view = makeDefaultView("table", "Table", source.properties);
    return { views: [view], activeViewId: view.id };
  }
  const ids = new Map<ID, ID>();
  const views = saved.map((view) => {
    const id = newId();
    ids.set(view.id, id);
    return { ...structuredClone(view), id };
  });
  const active = block?.attrs?.activeViewId as ID | null | undefined;
  return { views, activeViewId: (active && ids.get(active)) || views[0].id };
}

export function DatabasePageToggle({
  editor,
  onAction,
}: {
  editor: Editor;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  const { activePageId } = useOptionalActivePage();
  const picked = pickedBlock(editor);
  const type = picked?.node.type.name;

  // A database block (not a linked view of a database kept elsewhere).
  const sourceId =
    type === "database" && !picked?.node.attrs.isLinked
      ? ((picked?.node.attrs.sourceId as ID | null) ?? null)
      : null;
  const { data: source } = useDataSource(sourceId);

  // A page link to a database page.
  const linkedPageId =
    type === "pageLink"
      ? ((picked?.node.attrs.pageId as ID | null) ?? null)
      : null;
  const { data: sources } = useDataSources();
  const linkedSource = linkedPageId
    ? ((sources as DataSource[] | undefined) ?? []).find(
        (s) => s.pageId === linkedPageId,
      )
    : undefined;
  const { data: linkedPage } = usePage(linkedSource ? linkedPageId : null);

  if (!picked || !activePageId) return null;
  // A database's own page keeps its layout (title, database) fixed.
  const onDatabasePage = !!editor.storage.paragraph?.isDatabasePage;
  if (onDatabasePage) return null;

  const canTurnIntoPage =
    !!source && !!source.pageId && source.pageId !== activePageId;
  const canTurnIntoInline =
    !!linkedSource &&
    !!linkedPage &&
    linkedPage.deletedAt == null &&
    linkedPage.parentId === activePageId &&
    !inTableCell(editor, picked.pos);

  if (!canTurnIntoPage && !canTurnIntoInline) return null;

  const replaceBlock = (make: () => PMNode | null) => {
    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        const current = tr.doc.nodeAt(picked.pos);
        if (!current || current.type.name !== type) return false;
        const next = make();
        if (!next) return false;
        if (dispatch) {
          tr.replaceWith(picked.pos, picked.pos + current.nodeSize, next);
          tr.setSelection(NodeSelection.create(tr.doc, picked.pos));
        }
        return true;
      })
      .run();
    onAction?.();
  };

  const turnIntoPage = () =>
    replaceBlock(() => {
      if (!source) return null;
      return editor.schema.nodes.pageLink.create({
        pageId: source.pageId,
        parentId: activePageId,
        title: source.name || (picked.node.attrs.title as string) || null,
        nodeId: `pageLink-${Date.now()}`,
      });
    });

  const turnIntoInline = () =>
    replaceBlock(() => {
      if (!linkedSource || !linkedPage) return null;
      const { views, activeViewId } = viewsFromPage(linkedPage, linkedSource);
      return editor.schema.nodes.database.create({
        id: newId(),
        sourceId: linkedSource.id,
        pageId: linkedPage.id,
        title: linkedPage.title ?? "",
        views,
        activeViewId,
        locked: false,
        isLinked: false,
      });
    });

  return (
    <DropdownMenuItem asChild>
      <Button
        type="button"
        variant="ghost"
        className="menu-button"
        style={{ justifyContent: "flex-start", width: "100%" }}
        onClick={canTurnIntoPage ? turnIntoPage : turnIntoInline}
      >
        {canTurnIntoPage ? (
          <FileText className="tiptap-button-icon" />
        ) : (
          <Table2 className="tiptap-button-icon" />
        )}
        <span className="tiptap-button-text">
          {canTurnIntoPage
            ? t("blockTypes.turnIntoPage")
            : t("blockMenu.turnIntoInline")}
        </span>
      </Button>
    </DropdownMenuItem>
  );
}
