import { useCallback, useEffect, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { usePeople } from "src/hooks/use-people";
import { usePages, usePagesBase } from "src/hooks/use-pages";
import { useDataSources } from "src/hooks/use-data-sources";
import type { DataSource, Page, Person } from "src/types";
import { rowIdText } from "src/features/database/utils/row-summary";
import type { RowMentionEntry } from "./types";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { inviteToWorkspace } from "src/api/workspace-members";

// Every page's title, to name a row's database.
const selectTitles = (pages: Page[]) =>
  new Map(pages.map((p) => [p.id, p.title]));

// Every database row the @ menu can offer (not templates, not in the trash).
const selectRows = (pages: Page[]) =>
  pages.filter(
    (p) =>
      p.sourceId != null && p.deletedAt == null && p.category !== "Template",
  );

const NO_PEOPLE: Person[] = [];
const NO_PAGES: Page[] = [];

/**
 * What the @ menu offers — people, pages, rows — kept in the editor's storage,
 * where its items() reads them.
 *
 * Mounted with the editor (editor-provider, peek, centre view), so the menu
 * has everything from the first "@" (filled by the menu itself, the first
 * open only showed dates). Written straight into storage, without a
 * transaction: dispatching one while the menu opens — inside ProseMirror's
 * view update — could leave the view out of step with the document (a line
 * the caret can't reach, node views that lose their position).
 */
export function useMentionData(editor: Editor | null) {
  const { data: people = NO_PEOPLE } = usePeople();
  const { data: pages = NO_PAGES } = usePages();
  const { data: rowPages } = usePagesBase(selectRows);
  const { data: titleOf } = usePagesBase(selectTitles);
  const { data: sources } = useDataSources();

  // Each row with its ID ("TASK-12") when its database has an ID property,
  // and its database's name.
  const rows = useMemo<RowMentionEntry[]>(() => {
    const byId = new Map(
      ((sources as DataSource[] | undefined) ?? []).map((s) => [s.id, s]),
    );
    return (rowPages ?? []).map((r) => {
      const source = byId.get(r.sourceId!);
      return {
        id: r.id,
        title: r.title || "New Page",
        idText: rowIdText(r, source),
        cover: r.cover,
        dbName:
          (source?.pageId && titleOf?.get(source.pageId)) || source?.name || "",
      };
    });
  }, [rowPages, sources, titleOf]);

  // "Invite…" in the menu: invite each address to this workspace.
  const { workspaceId } = useCurrentWorkspace();
  const invite = useCallback(
    async (emails: string[], role: "member" | "guest") => {
      if (!workspaceId) throw new Error("No workspace");
      for (const email of emails) {
        await inviteToWorkspace(workspaceId, email, role);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    if (editor) {
      writeMentionData(editor, {
        people: people as Person[],
        pages: pages as Page[],
        rows,
        invite,
      });
    }
  }, [editor, people, pages, rows, invite]);
}

/** Into the storage the menu's items() reads (no transaction — see above). */
function writeMentionData(
  editor: Editor,
  data: {
    people: Person[];
    pages: Page[];
    rows: RowMentionEntry[];
    invite: (emails: string[], role: "member" | "guest") => Promise<void>;
  },
) {
  if (editor.isDestroyed) return;
  const storage = editor.storage as unknown as {
    mention?: {
      people: Person[];
      rows: RowMentionEntry[];
      invite?: (emails: string[], role: "member" | "guest") => Promise<void>;
    };
    pageLink?: { pages: Page[] };
  };
  if (storage.mention) {
    storage.mention.people = data.people;
    storage.mention.rows = data.rows;
    storage.mention.invite = data.invite;
  }
  if (storage.pageLink) storage.pageLink.pages = data.pages;
}
