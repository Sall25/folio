import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  CreditCard,
  Download,
  Fingerprint,
  Globe,
  LayoutGrid,
  Link2,
  Monitor,
  Settings,
  Settings2,
  Shield,
  Sparkles,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import "./workspace-settings-modal.scss";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";

export interface SettingsNavItem {
  id: string;
  /** i18n key — resolved with t() at render, not a literal label. */
  labelKey: string;
  icon: ReactNode;
}

export interface SettingsNavSection {
  /** i18n key for the section heading; undefined = no label (e.g. account block) */
  labelKey?: string;
  items: SettingsNavItem[];
}

// Static data (module-level) holds KEYS, not labels — t() can't run here.
const NAV: SettingsNavSection[] = [
  {
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
        icon: <Settings2 size={16} />,
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
      {
        id: "language",
        labelKey: "settings.items.language",
        icon: <Globe size={16} />,
      },
    ],
  },
  {
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
  },
];

function findLabelKey(id: string): string {
  for (const s of NAV) {
    const it = s.items.find((i) => i.id === id);
    if (it) return it.labelKey;
  }
  return "";
}

export interface WorkspaceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  /** Controlled active nav id. Omit to let the modal manage it internally. */
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Content header title — defaults to the active nav item's label. */
  title?: string;
  /** Right-aligned slot in the content header (e.g. a "Learn more" link). */
  headerAction?: ReactNode;
  /** The content pane body for the active section. */
  children?: ReactNode;
  /** Account identity shown at the top of the nav. */
  account?: { name: string; email: string; avatarUrl?: string };
  /**
   * Whether the current user is present on some live collaborative
   * connection (a page's HocuspocusProvider) — this modal has no provider
   * of its own, so the caller must derive this itself, e.g. from whichever
   * page was open when settings was invoked. Omit if there's no meaningful
   * connection to check; the dot simply won't render.
   */
  online?: boolean;
}

export function WorkspaceSettingsModal({
  open,
  onClose,
  activeId,
  onSelect,
  title,
  headerAction,
  children,
  account = { name: "Workspace", email: "" },
  online,
}: WorkspaceSettingsModalProps) {
  const { t } = useTranslation();
  const [internalActive, setInternalActive] = useState("people");
  const active = activeId ?? internalActive;

  const select = (id: string) => {
    onSelect?.(id);
    if (activeId === undefined) setInternalActive(id);
  };

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const activeLabelKey = findLabelKey(active);

  return (
    <>
      <div className="ws-settings__backdrop" onClick={onClose} />

      <div
        className="ws-settings"
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.modalAria")}
      >
        {/* ── Left nav ──────────────────────────────────────────────── */}
        <aside className="ws-settings__nav">
          {/* Account identity */}
          <div className="ws-settings__account">
            <Avatar
              src={account.avatarUrl}
              name={account.name}
              online={online}
            />
            <div className="ws-settings__account-text">
              <span className="ws-settings__account-name">{account.name}</span>
              {account.email && (
                <span className="ws-settings__account-email">
                  {account.email}
                </span>
              )}
            </div>
          </div>

          <div className="ws-settings__nav-scroll">
            {NAV.map((section, i) => (
              <div
                className="ws-settings__nav-section"
                key={section.labelKey ?? i}
              >
                {section.labelKey && (
                  <span className="ws-settings__nav-label">
                    {t(section.labelKey)}
                  </span>
                )}
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`ws-nav-item${active === item.id ? " is-active" : ""}`}
                    onClick={() => select(item.id)}
                  >
                    <span className="ws-nav-item__icon">{item.icon}</span>
                    <span className="ws-nav-item__label">
                      {t(item.labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <Separator orientation="horizontal" style={{ height: 0.5 }} />
          <div className="ws-settings__nav-footer">
            <Button
              variant="ghost"
              style={{ justifyContent: "flex-start", width: "100%", gap: 8 }}
            >
              <Sparkles className="tiptap-button-icon" size={16} />
              <span className="tiptap-button-text">
                {t("settings.getUnlimitedAi")}
              </span>
            </Button>
          </div>
        </aside>

        {/* ── Content pane ──────────────────────────────────────────── */}
        <section className="ws-settings__content">
          <header className="ws-settings__header">
            <h1 className="ws-settings__title">
              {title ?? (activeLabelKey ? t(activeLabelKey) : "")}
            </h1>
            <div className="ws-settings__header-action">{headerAction}</div>
          </header>

          <div className="ws-settings__body">{children}</div>
        </section>

        <button
          type="button"
          className="ws-settings__close"
          aria-label={t("settings.closeAria")}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
    </>
  );
}
