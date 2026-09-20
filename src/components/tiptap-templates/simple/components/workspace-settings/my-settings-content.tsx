import { useTranslation } from "react-i18next";
import { useLocalStorage } from "../../hooks/use-local-storage";
import { THEME_KEY } from "src/hooks/use-apply-theme";
import type { Theme, WorkspaceLanguage } from "src/types";
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

export function MySettingsContent() {
  const { t, i18n } = useTranslation();
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

      <SettingRow
        label={t("settings.mySettings.language", "Language")}
        description={t(
          "settings.mySettings.languageDesc",
          "Your own language for the interface.",
        )}
      >
        <Select<WorkspaceLanguage>
          value={i18n.language as WorkspaceLanguage}
          onChange={(v) => i18n.changeLanguage(v)}
          options={[
            { value: "en", label: "English" },
            { value: "fr", label: "Français" },
          ]}
        />
      </SettingRow>
    </div>
  );
}
