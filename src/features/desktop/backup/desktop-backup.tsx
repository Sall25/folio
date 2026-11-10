import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { usePagesBase } from "src/hooks/use-pages";
import { useDataSources } from "src/hooks/use-data-sources";
import {
  backupDue,
  readBackupSettings,
  runBackup,
} from "src/lib/desktop-backup";
import type { DataSource, Page } from "src/types";

// Desktop app: the workspace backup (src/lib/desktop-backup.ts).

const allPages = (pages: Page[]) => pages;
const CHECK_MS = 10 * 60 * 1000;
const FIRST_CHECK_MS = 60 * 1000;

/** Backs up the current workspace now. Resolves with how many files the
 *  backup holds, or null when there's nothing to do yet (no folder, pages
 *  not loaded). Throws when writing fails. */
// eslint-disable-next-line react-refresh/only-export-components
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
      dataSources: (dataSources as DataSource[]) ?? [],
      untitled: t("page.untitled"),
    });
  }, [personId, workspace, workspaceId, pages, dataSources, t]);
}

/** Runs the backup when it's due: a minute after start, then every ten
 *  minutes checks whether the chosen interval has passed. Renders nothing. */
export function DesktopBackup() {
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const run = useRunBackup();
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    if (!personId) return;
    const check = () => {
      if (!backupDue(readBackupSettings(personId))) return;
      runRef.current().catch((error) => console.warn("[backup] failed", error));
    };
    const first = window.setTimeout(check, FIRST_CHECK_MS);
    const id = window.setInterval(check, CHECK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [personId]);

  return null;
}
