import { useEffect, useState, type ReactNode } from "react";
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

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface SettingsNavSection {
  /** undefined = no section label (e.g. the account block) */
  label?: string;
  items: SettingsNavItem[];
}

const NAV: SettingsNavSection[] = [
  {
    label: "Account",
    items: [
      { id: "my-account", label: "My account", icon: <UserCircle size={16} /> },
      {
        id: "my-settings",
        label: "My settings",
        icon: <Settings2 size={16} />,
      },
      {
        id: "my-notifications",
        label: "My notifications",
        icon: <Bell size={16} />,
      },
      {
        id: "my-connections",
        label: "My connections",
        icon: <Link2 size={16} />,
      },
      { id: "language", label: "Language & region", icon: <Globe size={16} /> },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "settings", label: "Settings", icon: <Settings size={16} /> },
      { id: "teamspaces", label: "Teamspaces", icon: <LayoutGrid size={16} /> },
      { id: "people", label: "People", icon: <Users size={16} /> },
      { id: "sites", label: "Sites", icon: <Monitor size={16} /> },
      { id: "security", label: "Security", icon: <Shield size={16} /> },
      {
        id: "identity",
        label: "Identity & provisioning",
        icon: <Fingerprint size={16} />,
      },
      { id: "connections", label: "Connections", icon: <Link2 size={16} /> },
      { id: "import", label: "Import", icon: <Download size={16} /> },
      { id: "billing", label: "Billing", icon: <CreditCard size={16} /> },
    ],
  },
];

function findLabel(id: string): string {
  for (const s of NAV) {
    const it = s.items.find((i) => i.id === id);
    if (it) return it.label;
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
}: WorkspaceSettingsModalProps) {
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

  const initial = (account.name || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <div className="ws-settings__backdrop" onClick={onClose} />

      <div
        className="ws-settings"
        role="dialog"
        aria-modal="true"
        aria-label="Workspace settings"
      >
        {/* ── Left nav ──────────────────────────────────────────────── */}
        <aside className="ws-settings__nav">
          {/* Account identity */}
          <div className="ws-settings__account">
            {account.avatarUrl ? (
              <img
                className="ws-settings__avatar"
                src={account.avatarUrl}
                alt=""
              />
            ) : (
              <span className="ws-settings__avatar ws-settings__avatar--initial">
                {initial}
              </span>
            )}
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
                key={section.label ?? i}
              >
                {section.label && (
                  <span className="ws-settings__nav-label">
                    {section.label}
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
                    <span className="ws-nav-item__label">{item.label}</span>
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
              <span className="tiptap-button-text">Get unlimited AI</span>
            </Button>
          </div>
        </aside>

        {/* ── Content pane ──────────────────────────────────────────── */}
        <section className="ws-settings__content">
          <header className="ws-settings__header">
            <h1 className="ws-settings__title">{title ?? findLabel(active)}</h1>
            <div className="ws-settings__header-action">{headerAction}</div>
          </header>

          <div className="ws-settings__body">{children}</div>
        </section>

        <button
          type="button"
          className="ws-settings__close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
    </>
  );
}
