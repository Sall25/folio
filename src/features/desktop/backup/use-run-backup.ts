import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { usePagesBase } from "src/hooks/use-pages";
import { useDataSources } from "src/hooks/use-data-sources";
import { runBackup } from "src/lib/desktop-backup";
import type { DataSource, Page } from "src/types";

// Desktop app: backing up the current workspace (src/lib/desktop-backup.ts),
// for DesktopBackup's schedule and My settings' "Back up now".

const allPages = (pages: Page[]) => pages;

/** Backs up the current workspace now. Resolves with how many files the
 *  backup holds, or null when there's nothing to do yet (no folder, pages
 *  not loaded). Throws when writing fails. */
export function useRunBackup() {
  const { t } = useTranslation();
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const { workspace, workspaceId } = useCurrentWorkspace();
  const { data: pages } = usePagesBase(allPages);
  const { data: dataSources } = useDataSources();

  return useCallback(async () => {
    if (!personId || !workspace || !pages) return null;
    return runBackup({
      personId,
      workspaceName: workspace.name,
      pages: pages.filter((p) => p.workspaceId === workspaceId),
      // useDataSources() without a select is typed loosely.
      dataSources: (dataSources as DataSource[] | undefined) ?? [],
      untitled: t("page.untitled"),
    });
  }, [personId, workspace, workspaceId, pages, dataSources, t]);
}
