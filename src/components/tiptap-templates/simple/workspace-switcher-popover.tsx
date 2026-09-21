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
import {
  useCurrentWorkspace,
  useOwnedWorkspaces,
} from "src/hooks/use-workspaces";
import {
  useCreateWorkspace,
  useSwitchWorkspace,
} from "src/hooks/use-workspace-switch";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePeople } from "src/hooks/use-people";
import { useWorkspaceSettings as useWorkspaceSettingsModal } from "./context/workspace-settings-context";
import { supabase } from "src/api/supabase-client";
import "./workspace-switcher-popover.scss";
import type { Person, Workspace } from "src/types";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

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

function workspaceGlyph(ws: Workspace) {
  if (ws.icon) {
    return (
      <DynamicIcon
        name={ws.icon}
        style={{ width: 16, height: 16, color: ws.iconColor ?? "currentColor" }}
      />
    );
  }
  return (ws.name || "?").charAt(0).toUpperCase();
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
  const { workspaces: ownedWorkspaces } = useOwnedWorkspaces();
  const { person } = useCurrentPerson();
  const { data: people = [] } = usePeople();
  const { onOpenChange, setActiveId } = useWorkspaceSettingsModal();

  const switchWorkspace = useSwitchWorkspace();
  const createWorkspace = useCreateWorkspace();

  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left });
  }, [open, anchorRef]);

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

  const handleSwitch = (targetId: string) => {
    if (targetId === workspace?.id) {
      onClose();
      return;
    }
    switchWorkspace.mutate(targetId, { onSuccess: onClose });
  };

  const handleCreate = () => {
    createWorkspace.mutate(t("workspace.newDefaultName", "New workspace"), {
      onSuccess: onClose,
    });
  };

  const logout = async () => {
    onClose();
    await supabase.auth.signOut();
  };

  const busy = switchWorkspace.isPending || createWorkspace.isPending;

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

      {/* ── Account + owned-workspace list ───────────────────────── */}
      {person?.email && <div className="ws-switch__email">{person.email}</div>}

      {ownedWorkspaces.map((ws) => (
        <Row
          key={ws.id}
          icon={
            <span className="ws-switch__list-icon">{workspaceGlyph(ws)}</span>
          }
          label={ws.name}
          trailing={ws.id === workspace?.id ? <Check size={15} /> : undefined}
          disabled={busy}
          onClick={() => handleSwitch(ws.id)}
        />
      ))}

      {/* New workspace — now enabled. Creates + switches atomically. */}
      <Row
        icon={<Plus size={16} />}
        label={
          createWorkspace.isPending
            ? t("workspace.creating", "Creating…")
            : t("workspace.new", "New workspace")
        }
        accent
        disabled={busy}
        onClick={handleCreate}
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
