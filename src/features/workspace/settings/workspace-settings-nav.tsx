import type { ReactNode } from "react";
import {
  Bell,
  CreditCard,
  Download,
  Fingerprint,
  LayoutGrid,
  Link2,
  Monitor,
  Settings,
  Shield,
  SlidersHorizontal,
  UserCircle,
  Users,
} from "src/components/icons";

// The settings modal's nav: sections of items. Kept out of the modal's file
// so it can share these with workspace-settings.tsx (a component file may
// only export components, for fast refresh).

export interface SettingsNavItem {
  id: string;
  /** i18n key — resolved with t() at render, not a literal label. */
  labelKey: string;
  /** A literal label (e.g. a teamspace's name); wins over labelKey. */
  label?: string;
  icon: ReactNode;
}

export interface SettingsNavSection {
  /** i18n key for the section heading; undefined = no label (e.g. account block) */
  labelKey?: string;
  /** A literal heading (e.g. a teamspace's name); wins over labelKey. */
  label?: string;
  items: SettingsNavItem[];
}

// Static data (module-level) holds KEYS, not labels — t() can't run here.
export const ACCOUNT_NAV_SECTION: SettingsNavSection = {
  labelKey: "settings.nav.account",
  items: [
    {
      id: "my-account",
      labelKey: "settings.items.myAccount",
      icon: <UserCircle size={16} />,
    },
    {
      id: "my-settings",
      labelKey: "settings.items.mySettings",
      icon: <SlidersHorizontal size={16} />,
    },
    {
      id: "my-notifications",
      labelKey: "settings.items.myNotifications",
      icon: <Bell size={16} />,
    },
    {
      id: "my-connections",
      labelKey: "settings.items.myConnections",
      icon: <Link2 size={16} />,
    },
  ],
};

export const WORKSPACE_NAV_SECTION: SettingsNavSection = {
  labelKey: "settings.nav.workspace",
  items: [
    {
      id: "settings",
      labelKey: "settings.items.settings",
      icon: <Settings size={16} />,
    },
    {
      id: "teamspaces",
      labelKey: "settings.items.teamspaces",
      icon: <LayoutGrid size={16} />,
    },
    {
      id: "people",
      labelKey: "settings.items.people",
      icon: <Users size={16} />,
    },
    {
      id: "sites",
      labelKey: "settings.items.sites",
      icon: <Monitor size={16} />,
    },
    {
      id: "security",
      labelKey: "settings.items.security",
      icon: <Shield size={16} />,
    },
    {
      id: "identity",
      labelKey: "settings.items.identity",
      icon: <Fingerprint size={16} />,
    },
    {
      id: "connections",
      labelKey: "settings.items.connections",
      icon: <Link2 size={16} />,
    },
    {
      id: "import",
      labelKey: "settings.items.import",
      icon: <Download size={16} />,
    },
    {
      id: "billing",
      labelKey: "settings.items.billing",
      icon: <CreditCard size={16} />,
    },
  ],
};

/** The workspace's settings: your account, then the workspace. */
export const DEFAULT_SETTINGS_NAV: SettingsNavSection[] = [
  ACCOUNT_NAV_SECTION,
  WORKSPACE_NAV_SECTION,
];
