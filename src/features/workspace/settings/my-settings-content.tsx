import { useCallback, useEffect, useState } from "react";
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
import "./workspace-settings-content.scss";

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

      <OfflineStorageRow />
    </div>
  );
}
