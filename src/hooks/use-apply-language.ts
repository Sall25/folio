import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { WorkspaceLanguage } from "src/types";

/**
 * Syncs the live i18next language to the current workspace's language.
 * Language is per-workspace: switching workspaces re-applies that workspace's
 * stored setting. i18n.changeLanguage is global (no workspace concept of its
 * own), so this hook is what makes t() reflect the current workspace.
 */
export function useApplyLanguage(
  workspaceLanguage: WorkspaceLanguage | undefined,
) {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (!workspaceLanguage) return;
    if (i18n.language === workspaceLanguage) return;
    i18n.changeLanguage(workspaceLanguage);
  }, [workspaceLanguage, i18n]);
}
