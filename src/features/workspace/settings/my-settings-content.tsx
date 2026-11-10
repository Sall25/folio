import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  clearOfflineCopies,
  formatBytes,
  getOfflineStorageUsage,
} from "src/lib/offline-storage";
import { useLocalStorage } from "../../../hooks/use-local-storage";
import { THEME_KEY } from "src/hooks/use-apply-theme";
import type { Theme } from "src/types";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useSession } from "src/hooks/use-session";
import { Toggle } from "src/components/tiptap-ui-primitive/toggle";
import {
  isWorkspaceKept,
  setKeepFavorites,
  setWorkspaceKept,
  useKeepChoices,
} from "src/lib/offline-keep";
import { countDocCopies } from "src/lib/offline-doc-cache";
import {
  clearMedia,
  openMediaFolder,
  setMediaAuto,
  useMediaAutoPrefs,
  useMediaBytes,
} from "src/lib/media-cache";
import { isDesktopApp } from "src/lib/desktop";
import { usePagesBase } from "src/hooks/use-pages";
import {
  openBackupFolder,
  pickBackupFolder,
  updateBackupSettings,
  useBackupSettings,
  type BackupEvery,
} from "src/lib/desktop-backup";
import {
  CAPTURE_SHORTCUTS,
  setCaptureShortcut,
  shortcutLabel,
  useCaptureShortcut,
  useRunBackup,
} from "src/features/desktop";
import type { Page } from "src/types";
import "./workspace-settings-content.scss";
import { AppearancePicker } from "./appearance-picker";
import { IconStyleSettings } from "./icon-style-settings";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ws-setting-row">
      <div className="ws-setting-row__text">
        <span className="ws-setting-row__label">{label}</span>
        {description && (
          <span className="ws-setting-row__desc">{description}</span>
        )}
      </div>
      <div className="ws-setting-row__control">{children}</div>
    </div>
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      className="ws-select"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// How much Folio keeps on this device for offline use, with a way to free
// it. Clearing keeps pages with unsent edits and the app itself; pages are
// saved again the next time they're opened.
function OfflineStorageRow() {
  const { t, i18n } = useTranslation();
  const [usage, setUsage] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(() => {
    void getOfflineStorageUsage().then(setUsage);
  }, []);
  useEffect(refresh, [refresh]);

  const clear = async () => {
    setClearing(true);
    try {
      await clearOfflineCopies();
    } finally {
      setClearing(false);
      refresh();
    }
  };

  return (
    <SettingRow
      label={t("settings.mySettings.offlineStorage", "Offline storage")}
      description={t(
        "settings.mySettings.offlineStorageDesc",
        "Pages and images saved on this device so they open without a connection. Clearing keeps edits that haven't been sent yet.",
      )}
    >
      {usage !== null && (
        <span className="ws-setting-row__static">
          {formatBytes(usage, i18n.language)}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        disabled={clearing}
        onClick={() => void clear()}
        style={{ border: "1px solid var(--tt-border-color)" }}
      >
        {t("settings.mySettings.offlineStorageClear", "Clear")}
      </Button>
    </SettingRow>
  );
}

export function MySettingsContent() {
  const { t } = useTranslation();
  const { workspace } = useCurrentWorkspace();

  // Personal theme — the actual applied value in THIS browser, independent
  // of workspace.settings.defaultTheme (which only seeds new members). No
  // "remove" fallback needed here the way the workspace control's onChange
  // handler has one — this IS the personal override.
  const [theme, setTheme] = useLocalStorage<Theme>(
    THEME_KEY,
    workspace?.settings.defaultTheme ?? "system",
  );

  return (
    <div className="ws-settings-content">
      <SettingRow
        label={t("settings.mySettings.theme", "Theme")}
        description={t(
          "settings.mySettings.themeDesc",
          "Your own theme for this device. Overrides the workspace default.",
        )}
      >
        <Select<Theme>
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t("settings.theme.system", "System") },
            { value: "light", label: t("settings.theme.light", "Light") },
            { value: "dark", label: t("settings.theme.dark", "Dark") },
          ]}
        />
      </SettingRow>
      <AppearancePicker />
      <IconStyleSettings />
      <OfflineFavoritesRow />
      {isDesktopApp && <OfflineWorkspaceRow />}
      {isDesktopApp && <OfflineMediaRows />}
      {isDesktopApp && <BackupRows />}
      {isDesktopApp && <CaptureShortcutRow />}
      <OfflineStorageRow />
    </div>
  );
}

// Downloads your favorite pages to this device and keeps them fresh
// (offline-keep.ts), so they open without a connection.
function OfflineFavoritesRow() {
  const { t } = useTranslation();
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const { favorites } = useKeepChoices(personId);
  if (!personId) return null;

  return (
    <SettingRow
      label={t("settings.mySettings.offlineFavorites")}
      description={t("settings.mySettings.offlineFavoritesDesc")}
    >
      <Toggle
        checked={favorites}
        onChangeAsync={async (on) => setKeepFavorites(personId, on)}
      />
    </SettingRow>
  );
}

// Desktop app: the whole workspace on this computer (offline-keep.ts), on
// unless turned off. Every
// page and database row is downloaded and kept up to date in the
// background (OfflineDocSync); copies are files on disk here, so there's
// room. Shows how many are saved so far.
const allPages = (pages: Page[]) => pages;
const PROGRESS_MS = 3000;

function OfflineWorkspaceRow() {
  const { t } = useTranslation();
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const { workspace, workspaceId } = useCurrentWorkspace();
  const choices = useKeepChoices(personId);
  const kept = isWorkspaceKept(choices, workspaceId);

  const { data: pages } = usePagesBase(allPages);
  const pageIds = useMemo(
    () =>
      (pages ?? [])
        .filter((p) => p.deletedAt == null && p.workspaceId === workspaceId)
        .map((p) => p.id),
    [pages, workspaceId],
  );

  // How many are on this computer, checked every few seconds while it
  // downloads.
  const [saved, setSaved] = useState<number | null>(null);
  useEffect(() => {
    if (!kept || !personId) return;
    let cancelled = false;
    const check = () =>
      void countDocCopies(personId, pageIds).then((n) => {
        if (!cancelled) setSaved(n);
      });
    check();
    const id = window.setInterval(check, PROGRESS_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [kept, personId, pageIds]);

  if (!personId || !workspaceId) return null;

  return (
    <SettingRow
      label={t("settings.mySettings.offlineWorkspace")}
      description={
        kept && saved !== null
          ? t("settings.mySettings.offlineWorkspaceProgress", {
              saved,
              total: pageIds.length,
            })
          : t("settings.mySettings.offlineWorkspaceDesc", {
              workspace: workspace?.name ?? "",
            })
      }
    >
      <Toggle
        checked={kept}
        onChangeAsync={async (on) => setWorkspaceKept(personId, workspaceId, on)}
      />
    </SettingRow>
  );
}

// Desktop app: media saved on this computer (media-cache.ts). Images are
// saved automatically by default; videos, audio and files only with "Save
// to this computer" on the block, unless set to automatic here. Shows the
// space they take, opens their folder, or removes them all.
type MediaMode = "auto" | "ask";

function OfflineMediaRows() {
  const { t, i18n } = useTranslation();
  const prefs = useMediaAutoPrefs();
  const bytes = useMediaBytes();
  const [clearing, setClearing] = useState(false);

  const modes: { value: MediaMode; label: string }[] = [
    { value: "auto", label: t("settings.mySettings.mediaAuto") },
    { value: "ask", label: t("settings.mySettings.mediaAsk") },
  ];

  const clear = async () => {
    setClearing(true);
    try {
      await clearMedia();
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <SettingRow
        label={t("settings.mySettings.mediaImages")}
        description={t("settings.mySettings.mediaImagesDesc")}
      >
        <Select<MediaMode>
          value={prefs.images ? "auto" : "ask"}
          options={modes}
          onChange={(v) => setMediaAuto("image", v === "auto")}
        />
      </SettingRow>
      <SettingRow
        label={t("settings.mySettings.mediaOther")}
        description={t("settings.mySettings.mediaOtherDesc")}
      >
        <Select<MediaMode>
          value={prefs.other ? "auto" : "ask"}
          options={modes}
          onChange={(v) => setMediaAuto("other", v === "auto")}
        />
      </SettingRow>
      <SettingRow
        label={t("settings.mySettings.mediaSpace")}
        description={t("settings.mySettings.mediaSpaceDesc")}
      >
        <span className="ws-setting-row__static">
          {formatBytes(bytes, i18n.language)}
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void openMediaFolder()}
          style={{ border: "1px solid var(--tt-border-color)" }}
        >
          {t("settings.mySettings.mediaOpenFolder")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={clearing || bytes === 0}
          onClick={() => void clear()}
          style={{ border: "1px solid var(--tt-border-color)" }}
        >
          {t("settings.mySettings.offlineStorageClear", "Clear")}
        </Button>
      </SettingRow>
    </>
  );
}

// Desktop app: the workspace backed up as Markdown in a folder on this
// computer (src/lib/desktop-backup.ts, DesktopBackup runs it on schedule).
// Turning it on asks for the folder first, if none is chosen yet.
function BackupRows() {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const settings = useBackupSettings(personId);
  const runBackup = useRunBackup();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!personId) return null;

  const chooseFolder = async (): Promise<string | null> => {
    const folder = await pickBackupFolder();
    if (folder) updateBackupSettings(personId, { folder });
    return folder;
  };

  const backUpNow = async () => {
    setBusy(true);
    setError(null);
    try {
      await runBackup();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const status = error
    ? t("settings.mySettings.backupFailed", { reason: error })
    : settings.lastAt
      ? t("settings.mySettings.backupLast", {
          when: new Date(settings.lastAt).toLocaleString(i18n.language, {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          count: settings.lastCount ?? 0,
        })
      : t("settings.mySettings.backupNever");

  const bordered = { border: "1px solid var(--tt-border-color)" };

  return (
    <>
      <SettingRow
        label={t("settings.mySettings.backup")}
        description={t("settings.mySettings.backupDesc")}
      >
        <Toggle
          checked={settings.enabled}
          onChangeAsync={async (on) => {
            if (on && !settings.folder && !(await chooseFolder())) return;
            updateBackupSettings(personId, { enabled: on });
          }}
        />
      </SettingRow>
      <SettingRow
        label={t("settings.mySettings.backupFolder")}
        description={settings.folder ?? t("settings.mySettings.backupNoFolder")}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => void chooseFolder()}
          style={bordered}
        >
          {settings.folder
            ? t("settings.mySettings.backupChange")
            : t("settings.mySettings.backupChoose")}
        </Button>
      </SettingRow>
      <SettingRow label={t("settings.mySettings.backupEvery")} description={status}>
        <Select<BackupEvery>
          value={settings.every}
          onChange={(every) => updateBackupSettings(personId, { every })}
          options={[
            { value: "hour", label: t("settings.mySettings.backupHour") },
            { value: "day", label: t("settings.mySettings.backupDay") },
            { value: "week", label: t("settings.mySettings.backupWeek") },
          ]}
        />
      </SettingRow>
      <SettingRow
        label={t("settings.mySettings.backupNow")}
        description={t("settings.mySettings.backupNowDesc")}
      >
        {settings.folder && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void openBackupFolder(settings.folder!)}
            style={bordered}
          >
            {t("settings.mySettings.mediaOpenFolder")}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={busy || !settings.folder}
          onClick={() => void backUpNow()}
          style={bordered}
        >
          {busy
            ? t("settings.mySettings.backupRunning")
            : t("settings.mySettings.backupNowButton")}
        </Button>
      </SettingRow>
    </>
  );
}

// Desktop app: the quick capture shortcut (src/features/desktop/
// quick-capture), or none. Says so when another app already uses it.
function CaptureShortcutRow() {
  const { t } = useTranslation();
  const { shortcut, error } = useCaptureShortcut();

  return (
    <SettingRow
      label={t("settings.mySettings.capture")}
      description={
        error
          ? t("settings.mySettings.captureTaken")
          : t("settings.mySettings.captureDesc")
      }
    >
      <Select<string>
        value={shortcut}
        onChange={setCaptureShortcut}
        options={[
          ...CAPTURE_SHORTCUTS.map((s) => ({
            value: s as string,
            label: shortcutLabel(s),
          })),
          { value: "", label: t("settings.mySettings.captureOff") },
        ]}
      />
    </SettingRow>
  );
}
