import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import {
  ArrowLeft,
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
import { useTeamspaces } from "src/hooks/use-teamspaces";
import { useGroups } from "src/hooks/use-groups";
import { usePagesByCategory } from "src/hooks/use-pages";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useWorkspaceSettings as useWorkspaceSettingsModal } from "./context/workspace-settings-context";
import { supabase } from "src/api/supabase-client";
import "./workspace-switcher-popover.scss";
import {
  effectiveMemberCount,
  type Group,
  type Page,
  type Person,
  type Teamspace,
  type Workspace,
} from "src/types";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PageItemIcon } from "./page-item-icon";

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

function WorkspaceGlyph({ ws, size }: { ws: Workspace; size: number }) {
  if (ws.icon) {
    if (ws.iconTarget === "Emoji") {
      return <span style={{ fontSize: size, lineHeight: 1 }}>{ws.icon}</span>;
    }
    return (
      <DynamicIcon
        name={ws.icon}
        style={{
          width: size,
          height: size,
          color: ws.iconColor ?? "currentColor",
        }}
      />
    );
  }
  return <>{(ws.name || "?").charAt(0).toUpperCase()}</>;
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
  const navigate = useNavigate();
  const { workspace } = useCurrentWorkspace();
  const { workspaces: ownedWorkspaces } = useOwnedWorkspaces();
  const { person } = useCurrentPerson();
  const { data: people = [] } = usePeople();
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: groups = [] } = useGroups();
  const { data: teamspacePages = [] } = usePagesByCategory("Teamspaces");
  const space = useCurrentSpace();
  const { onOpenChange, setActiveId } = useWorkspaceSettingsModal();

  const switchWorkspace = useSwitchWorkspace();
  const createWorkspace = useCreateWorkspace();

  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Teamspaces you can enter: those whose root page RLS lets you read — the
  // current workspace's teamspaces plus ones you've joined elsewhere, never
  // teamspaces in your other owned workspaces. Name/icon come from the page.
  const enterableTeamspaces = useMemo(() => {
    const recordById = new Map(
      (teamspaces as Teamspace[]).map((ts) => [ts.id, ts]),
    );
    return (teamspacePages as Page[])
      .filter((p) => p.parentId == null && recordById.has(p.id))
      .map((page) => ({ page, record: recordById.get(page.id)! }));
  }, [teamspaces, teamspacePages]);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    // Ignore the click that opened us — the listener attaches during the same
    // event that toggled `open`, and could otherwise close immediately.
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, 0);

    const onDown = (e: MouseEvent) => {
      if (!armed) return;
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
      window.clearTimeout(arm);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos) return null;

  const inTeamspace = space.kind === "teamspace";
  const busy = switchWorkspace.isPending || createWorkspace.isPending;

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

  // Workspace rows: switching to ANOTHER workspace changes membership (RPC +
  // cache reset). Picking your CURRENT workspace while inside a teamspace
  // just leaves the teamspace — a URL change, no RPC.
  const handleWorkspace = (targetId: string) => {
    if (targetId === workspace?.id) {
      if (inTeamspace) navigate({ to: "/" });
      onClose();
      return;
    }
    switchWorkspace.mutate(targetId, {
      onSuccess: () => {
        // A teamspace URL from the old workspace may not be enterable in the
        // new one — always land on the new workspace's home.
        navigate({ to: "/" });
        onClose();
      },
    });
  };

  // Teamspace rows: entering is navigation only — membership never moves.
  const handleTeamspace = (teamspaceId: string) => {
    navigate({ to: `/t/${teamspaceId}` });
    onClose();
  };

  const handleCreate = () => {
    createWorkspace.mutate(t("workspace.newDefaultName", "New workspace"), {
      onSuccess: () => {
        navigate({ to: "/" });
        onClose();
      },
    });
  };

  const logout = async () => {
    onClose();
    await supabase.auth.signOut();
  };

  // ── Header: the CURRENT space's identity ────────────────────────────────
  const header =
    space.kind === "teamspace" ? (
      <div className="ws-switch__header">
        <span className="ws-switch__ws-icon">
          {space.page ? (
            <PageItemIcon
              cover={space.page.cover}
              styles={{ width: 18, height: 18, fontSize: 18 }}
            />
          ) : null}
        </span>
        <div className="ws-switch__ws-text">
          <span className="ws-switch__ws-name">
            {space.page?.title || t("teamspaces.untitled")}
          </span>
          <span className="ws-switch__ws-meta">
            {t("workspace.teamspace", "Teamspace")}
            {space.teamspace && (
              <>
                {" · "}
                {t("workspace.memberCount", {
                  count: effectiveMemberCount(
                    space.teamspace,
                    groups as Group[],
                  ),
                })}
              </>
            )}
          </span>
        </div>
      </div>
    ) : (
      <div className="ws-switch__header">
        <span className="ws-switch__ws-icon">
          {workspace ? <WorkspaceGlyph ws={workspace} size={18} /> : "?"}
        </span>
        <div className="ws-switch__ws-text">
          <span className="ws-switch__ws-name">{workspace?.name ?? ""}</span>
          <span className="ws-switch__ws-meta">
            {t("workspace.plan.free", "Free Plan")} ·{" "}
            {t("workspace.memberCount", {
              count: (people as Person[]).length,
            })}
          </span>
        </div>
      </div>
    );

  return createPortal(
    <div
      ref={ref}
      className="ws-switch"
      style={{ top: pos.top, left: pos.left }}
      role="menu"
    >
      {header}

      <div className="ws-switch__divider" />

      {/* ── Actions ──────────────────────────────────────────────── */}
      {inTeamspace ? (
        // Inside a teamspace: always one click back to your own workspace.
        // Upgrade / invite are workspace-level and don't apply here.
        <Row
          icon={<ArrowLeft size={16} />}
          label={t("workspace.backTo", {
            name: workspace?.name ?? "",
            defaultValue: "Back to {{name}}",
          })}
          onClick={() => {
            navigate({ to: "/" });
            onClose();
          }}
        />
      ) : (
        <>
          <Row
            icon={<ArrowUpCircle size={16} />}
            label={t("workspace.upgrade", "Upgrade")}
            accent
            onClick={onClose}
          />
          <Row
            icon={<Mail size={16} />}
            label={t("workspace.inviteMembers", "Invite members")}
            onClick={openInvite}
          />
        </>
      )}
      <Row
        icon={<Settings size={16} />}
        label={t("workspace.settings", "Settings")}
        onClick={openSettings}
      />
      <Row
        icon={<UserPlus size={16} />}
        label={t("workspace.addAccount", "Add account")}
        disabled
        title={t("workspace.comingSoon", "Coming soon")}
      />

      <div className="ws-switch__divider" />

      {person?.email && <div className="ws-switch__email">{person.email}</div>}

      {/* ── Workspaces you own ───────────────────────────────────── */}
      <div className="ws-switch__section-label">
        {t("workspace.sectionWorkspaces", "Workspaces")}
      </div>
      {ownedWorkspaces.map((ws) => (
        <Row
          key={ws.id}
          icon={
            <span className="ws-switch__list-icon">
              <WorkspaceGlyph ws={ws} size={16} />
            </span>
          }
          label={ws.name}
          trailing={
            !inTeamspace && ws.id === workspace?.id ? (
              <Check size={15} />
            ) : undefined
          }
          disabled={busy}
          onClick={() => handleWorkspace(ws.id)}
        />
      ))}

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

      {/* ── Teamspaces you can enter ─────────────────────────────── */}
      {enterableTeamspaces.length > 0 && (
        <>
          <div className="ws-switch__divider" />
          <div className="ws-switch__section-label">
            {t("workspace.sectionTeamspaces", "Teamspaces")}
          </div>
          {enterableTeamspaces.map(({ page }) => (
            <Row
              key={page.id}
              icon={
                <span className="ws-switch__list-icon">
                  <PageItemIcon
                    cover={page.cover}
                    styles={{ width: 16, height: 16, fontSize: 16 }}
                  />
                </span>
              }
              label={page.title || t("teamspaces.untitled")}
              trailing={
                inTeamspace && space.id === page.id ? (
                  <Check size={15} />
                ) : undefined
              }
              disabled={busy}
              onClick={() => handleTeamspace(page.id)}
            />
          ))}
        </>
      )}

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
