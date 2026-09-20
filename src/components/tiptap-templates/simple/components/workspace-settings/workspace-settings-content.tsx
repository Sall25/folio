import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import {
  useCurrentWorkspace,
  useManageWorkspace,
} from "src/hooks/use-workspaces";
import { useCurrentPerson } from "src/hooks/use-session";
import type {
  Theme,
  WorkspaceLanguage,
  InviteLanding,
  SwitchLanding,
  WorkspaceSettings,
} from "src/types";
import "./workspace-settings-content.scss";
import { THEME_KEY } from "src/hooks/use-apply-theme";
import { useLocalStorage } from "../../hooks/use-local-storage";

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

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`ws-toggle${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ws-toggle__thumb" />
    </button>
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="ws-select"
      value={value}
      disabled={disabled}
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

export function WorkspaceSettingsContent() {
  const { t } = useTranslation();
  const { renameAsync, setSettingAsync } = useManageWorkspace();
  const { person } = useCurrentPerson();

  // Only owners may edit workspace settings — the RLS update policy is
  // owner-gated, so for members every control is read-only. Showing disabled
  // controls (rather than hiding them) keeps members informed of the settings
  // without letting them trigger a silent permission error.
  const isOwner = person?.role === "owner";

  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const { workspace } = useCurrentWorkspace();

  const [value, setValue, remove] = useLocalStorage(
    THEME_KEY,
    workspace?.settings.defaultTheme ?? "system",
  );

  const onChangeTheme = (theme: Theme) => {
    // if (theme === value) return;
    remove();
    setValue(theme);
  };

  if (!workspace) {
    return (
      <div className="ws-settings-content__empty">
        {t("settings.workspace.loading", "Loading workspace…")}
      </div>
    );
  }

  const s = workspace.settings;
  const commitName = () => {
    const next = (nameDraft ?? workspace.name).trim();
    setNameDraft(null);
    if (next && next !== workspace.name) renameAsync(workspace.id, next);
  };

  // Guarded setter — no-ops for non-owners so a stray call can't hit the RLS
  // wall. The disabled controls already prevent this in the UI; this is belt
  // and suspenders.
  const set = <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K],
  ) => {
    if (!isOwner) return;
    setSettingAsync(workspace.id, key, value);
  };

  return (
    <div className="ws-settings-content">
      {!isOwner && (
        <div className="ws-settings-content__notice">
          {t(
            "settings.workspace.readOnly",
            "Only the workspace owner can change these settings.",
          )}
        </div>
      )}

      <SettingRow
        label={t("settings.workspace.name", "Name")}
        description={t(
          "settings.workspace.nameDesc",
          "The name of your workspace, shown in the sidebar.",
        )}
      >
        <Input
          value={nameDraft ?? workspace.name}
          disabled={!isOwner}
          onChange={(e) => setNameDraft(e.currentTarget.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </SettingRow>

      <Separator orientation="horizontal" />

      <SettingRow
        label={t("settings.workspace.theme", "Default theme")}
        description={t(
          "settings.workspace.themeDesc",
          "The theme new members start with. Anyone can change their own.",
        )}
      >
        <Select<Theme>
          value={value}
          disabled={!isOwner}
          onChange={(v) => {
            onChangeTheme(v);

            set("defaultTheme", v);
          }}
          options={[
            { value: "system", label: t("settings.theme.system", "System") },
            { value: "light", label: t("settings.theme.light", "Light") },
            { value: "dark", label: t("settings.theme.dark", "Dark") },
          ]}
        />
      </SettingRow>

      <SettingRow
        label={t("settings.workspace.language", "Language")}
        description={t(
          "settings.workspace.languageDesc",
          "The default language for this workspace.",
        )}
      >
        <Select<WorkspaceLanguage>
          value={s.language}
          disabled={!isOwner}
          onChange={(v) => set("language", v)}
          options={[
            { value: "en", label: "English" },
            { value: "fr", label: "Français" },
          ]}
        />
      </SettingRow>

      <Separator orientation="horizontal" />

      <SettingRow
        label={t("settings.workspace.landingInvite", "Invited members land on")}
        description={t(
          "settings.workspace.landingInviteDesc",
          "The first page someone sees when they join by invite.",
        )}
      >
        <Select<InviteLanding>
          value={s.landingOnInvite}
          disabled={!isOwner}
          onChange={(v) => set("landingOnInvite", v)}
          options={[
            {
              value: "welcome",
              label: t("settings.landing.welcome", "Welcome page"),
            },
            {
              value: "top-page",
              label: t("settings.landing.topPage", "Top page in sidebar"),
            },
            {
              value: "library",
              label: t("settings.landing.library", "Library"),
            },
          ]}
        />
      </SettingRow>

      <SettingRow
        label={t(
          "settings.workspace.landingSwitch",
          "On switching to this workspace",
        )}
        description={t(
          "settings.workspace.landingSwitchDesc",
          "Where you land when you switch into this workspace.",
        )}
      >
        <Select<SwitchLanding>
          value={s.landingOnSwitch}
          disabled={!isOwner}
          onChange={(v) => set("landingOnSwitch", v)}
          options={[
            {
              value: "last-visited",
              label: t("settings.landing.lastVisited", "Last visited page"),
            },
            {
              value: "top-page",
              label: t("settings.landing.topPage", "Top page in sidebar"),
            },
            {
              value: "library",
              label: t("settings.landing.library", "Library"),
            },
          ]}
        />
      </SettingRow>

      <Separator orientation="horizontal" />

      <SettingRow
        label={t("settings.workspace.peopleDirectory", "People directory")}
        description={t(
          "settings.workspace.peopleDirectoryDesc",
          "Enable the people directory and profile pages for this workspace.",
        )}
      >
        <Toggle
          checked={s.peopleDirectoryEnabled}
          disabled={!isOwner}
          onChange={(v) => set("peopleDirectoryEnabled", v)}
        />
      </SettingRow>

      <SettingRow
        label={t(
          "settings.workspace.recentActivity",
          "Show recent activity on profiles",
        )}
        description={t(
          "settings.workspace.recentActivityDesc",
          "Show people's recently created and edited pages, and their recent comments.",
        )}
      >
        <Toggle
          checked={s.showRecentActivityOnProfiles}
          disabled={!isOwner || !s.peopleDirectoryEnabled}
          onChange={(v) => set("showRecentActivityOnProfiles", v)}
        />
      </SettingRow>

      <SettingRow
        label={t("settings.workspace.hoverCards", "Hover cards")}
        description={t(
          "settings.workspace.hoverCardsDesc",
          "Show a person's profile info when you hover over their name.",
        )}
      >
        <Toggle
          checked={s.hoverCardsEnabled}
          disabled={!isOwner || !s.peopleDirectoryEnabled}
          onChange={(v) => set("hoverCardsEnabled", v)}
        />
      </SettingRow>
    </div>
  );
}
