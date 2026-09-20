import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Check,
  Plus,
  Settings,
  Mail,
  ArrowUpCircle,
  UserPlus,
} from "lucide-react";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePeople } from "src/hooks/use-people";
import { useWorkspaceSettings as useWorkspaceSettingsModal } from "./context/workspace-settings-context";
import { supabase } from "src/api/supabase-client";
import "./workspace-switcher-popover.scss";
import type { Person } from "src/types";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

// Notion-style workspace switcher. Single-workspace for v1: the list shows the
// one workspace with a checkmark, and "New workspace" is present-but-disabled
// (multi-workspace lands in v2). Everything else — Settings, Invite, account,
// Log out — is fully wired. The structure is B-ready: when multi-workspace
// ships, the single-item list becomes an array and the disabled state lifts.

function Row({
  icon,
  label,
  onClick,
  accent,
  disabled,
  title,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  accent?: boolean;
  disabled?: boolean;
  title?: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`ws-switch__row${accent ? " is-accent" : ""}${
        disabled ? " is-disabled" : ""
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
    >
      <span className="ws-switch__row-icon">{icon}</span>
      <span className="ws-switch__row-label">{label}</span>
      {trailing && <span className="ws-switch__row-trailing">{trailing}</span>}
    </button>
  );
}

export function WorkspaceSwitcherPopover({
  anchorRef,
  open,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { workspace } = useCurrentWorkspace();
  const { person } = useCurrentPerson();
  const { data: people = [] } = usePeople();
  const { onOpenChange, setActiveId } = useWorkspaceSettingsModal();

  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position under the anchor.
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left });
  }, [open, anchorRef]);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos) return null;

  const name = workspace?.name ?? "";
  const icon = workspace?.icon ?? null;
  const iconColor = workspace?.iconColor ?? null;
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const memberCount = (people as Person[]).length;

  const openSettings = () => {
    setActiveId("settings");
    onOpenChange(true);
    onClose();
  };

  const openInvite = () => {
    setActiveId("people");
    onOpenChange(true);
    onClose();
  };

  const logout = async () => {
    onClose();
    await supabase.auth.signOut();
  };

  return createPortal(
    <div
      ref={ref}
      className="ws-switch"
      style={{ top: pos.top, left: pos.left }}
      role="menu"
    >
      {/* ── Current workspace header ─────────────────────────────── */}
      <div className="ws-switch__header">
        <span className="ws-switch__ws-icon">
          {icon ? (
            <DynamicIcon
              name={icon}
              style={{
                width: 18,
                height: 18,
                color: iconColor ?? "currentColor",
              }}
            />
          ) : (
            initial
          )}
        </span>
        <div className="ws-switch__ws-text">
          <span className="ws-switch__ws-name">{name}</span>
          <span className="ws-switch__ws-meta">
            {t("workspace.plan.free", "Free Plan")} ·{" "}
            {t("workspace.memberCount", { count: memberCount })}
          </span>
        </div>
      </div>

      <div className="ws-switch__divider" />

      {/* ── Actions ──────────────────────────────────────────────── */}
      <Row
        icon={<ArrowUpCircle size={16} />}
        label={t("workspace.upgrade", "Upgrade")}
        accent
        onClick={onClose}
      />
      <Row
        icon={<Settings size={16} />}
        label={t("workspace.settings", "Settings")}
        onClick={openSettings}
      />
      <Row
        icon={<Mail size={16} />}
        label={t("workspace.inviteMembers", "Invite members")}
        onClick={openInvite}
      />
      <Row
        icon={<UserPlus size={16} />}
        label={t("workspace.addAccount", "Add account")}
        disabled
        title={t("workspace.comingSoon", "Coming soon")}
      />

      <div className="ws-switch__divider" />

      {/* ── Account + workspace list ─────────────────────────────── */}
      {person?.email && <div className="ws-switch__email">{person.email}</div>}

      <Row
        icon={
          <span className="ws-switch__list-icon">
            {icon ? (
              <DynamicIcon
                name={icon}
                style={{
                  width: 16,
                  height: 16,
                  color: iconColor ?? "currentColor",
                }}
              />
            ) : (
              initial
            )}
          </span>
        }
        label={name}
        trailing={<Check size={15} />}
        onClick={onClose}
      />

      {/* New workspace — disabled until multi-workspace (v2). */}
      <Row
        icon={<Plus size={16} />}
        label={t("workspace.new", "New workspace")}
        accent
        disabled
        title={t("workspace.comingSoon", "Coming soon")}
      />

      <div className="ws-switch__divider" />

      <Row
        icon={<span style={{ width: 16 }} />}
        label={t("workspace.logout", "Log out")}
        onClick={logout}
      />
    </div>,
    document.body,
  );
}
