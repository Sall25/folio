import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { Check, Plus, Users, Users2 } from "lucide-react";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useGroups } from "src/hooks/use-groups";
import {
  useEnterableTeamspaces,
  type EnterableTeamspace,
} from "src/hooks/use-enterable-teamspaces";
import {
  useAcceptInvite,
  useDeclineInvite,
  useMyInvites,
} from "src/hooks/use-teamspace-members";
import {
  effectiveMemberCount,
  type Group,
  type PageCover,
  type TeamspaceInvite,
} from "src/types";
import { PageItemIcon } from "../../page-item-icon";
import { WorkspaceGlyph } from "../../workspace-switcher-popover";
import "./teamspaces-panel.scss";

interface TeamspacesPanelProps {
  /** Called after a space was picked (closes the popover). */
  onDone: () => void;
  /** Open the create-teamspace modal (owned by the caller). */
  onCreate: () => void;
  /** Open the members modal for a teamspace (owned by the caller). */
  onManageMembers: (teamspaceId: string) => void;
}

// The invite snapshot carries the teamspace's icon; shape it as a PageCover
// so it renders exactly like the teamspace row will once joined.
function inviteCover(inv: TeamspaceInvite): PageCover {
  return {
    iconName: inv.iconName,
    target: (inv.iconTarget as PageCover["target"]) ?? null,
    coverImage: null,
    color: null,
    gradient: null,
    positionY: null,
  };
}

// Lists the spaces you can be in: your workspace first, then teamspaces —
// those hosted by your workspace, and ones you've joined elsewhere — plus
// invitations waiting for you.
export function TeamspacesPanel({
  onDone,
  onCreate,
  onManageMembers,
}: TeamspacesPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const space = useCurrentSpace();
  const { workspace } = useCurrentWorkspace();
  const { data: groups = [] } = useGroups();
  const teamspaces = useEnterableTeamspaces();
  const { invites } = useMyInvites();
  const accept = useAcceptInvite();
  const decline = useDeclineInvite();

  const hosted = teamspaces.filter(
    (ts) => ts.page.workspaceId === workspace?.id,
  );
  const joined = teamspaces.filter(
    (ts) => ts.page.workspaceId !== workspace?.id,
  );

  const goToWorkspace = () => {
    if (space.kind === "teamspace") navigate({ to: "/" });
    onDone();
  };

  const enter = (id: string) => {
    if (space.kind !== "teamspace" || space.id !== id) {
      navigate({ to: `/t/${id}` });
    }
    onDone();
  };

  const acceptInvite = (inviteId: string) => {
    accept.mutate(inviteId, {
      onSuccess: (teamspaceId) => {
        navigate({ to: `/t/${teamspaceId}` });
        onDone();
      },
    });
  };

  const renderRow = ({ page, record }: EnterableTeamspace) => {
    const active = space.kind === "teamspace" && space.id === page.id;
    const members = effectiveMemberCount(record, groups as Group[]);
    return (
      <div key={page.id} className="tsp-row-wrap">
        <button
          type="button"
          className={`tsp-row${active ? " is-active" : ""}`}
          onClick={() => enter(page.id)}
        >
          <span className="tsp-row__icon">
            <PageItemIcon
              cover={page.cover}
              styles={{ width: 16, height: 16, fontSize: 16 }}
            />
          </span>
          <span className="tsp-row__text">
            <span className="tsp-row__name">
              {page.title || t("teamspaces.untitled")}
            </span>
            <span className="tsp-row__meta">
              {t("teamspaces.memberCount", { count: members })}
            </span>
          </span>
          {active && <Check size={15} className="tsp-row__check" />}
        </button>
        <button
          type="button"
          className="tsp-row__side"
          aria-label={t("teamspacesPanel.manageMembers", "Members")}
          title={t("teamspacesPanel.manageMembers", "Members")}
          onClick={() => onManageMembers(page.id)}
        >
          <Users size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="tsp">
      <div className="tsp__header">
        <span className="tsp__title">
          {t("teamspacesPanel.title", "Teamspaces")}
        </span>
        {teamspaces.length > 0 && (
          <span className="tsp__count">{teamspaces.length}</span>
        )}
      </div>

      <div className="tsp__body">
        {/* ── Invitations waiting for you ─────────────────────────── */}
        {invites.length > 0 && (
          <>
            <div className="tsp__label">
              {t("teamspacesPanel.invitations", "Invitations")}
            </div>
            {invites.map((inv) => (
              <div key={inv.id} className="tsp-invite">
                <span className="tsp-row__icon">
                  {inv.iconName ? (
                    <PageItemIcon
                      cover={inviteCover(inv)}
                      styles={{ width: 16, height: 16, fontSize: 16 }}
                    />
                  ) : (
                    <Users2 size={15} />
                  )}
                </span>
                <span className="tsp-row__text">
                  <span className="tsp-row__name">
                    {inv.teamspaceName || t("teamspaces.untitled")}
                  </span>
                  <span className="tsp-row__meta">
                    {inv.inviterName
                      ? t("teamspacesPanel.invitedBy", {
                          name: inv.inviterName,
                          defaultValue: "Invited by {{name}}",
                        })
                      : t("teamspacesPanel.invited", "You're invited")}
                  </span>
                </span>
                <div className="tsp-invite__actions">
                  <button
                    type="button"
                    className="tsp-invite__btn is-primary"
                    disabled={accept.isPending}
                    onClick={() => acceptInvite(inv.id)}
                  >
                    {t("teamspacesPanel.accept", "Join")}
                  </button>
                  <button
                    type="button"
                    className="tsp-invite__btn"
                    disabled={decline.isPending}
                    onClick={() => decline.mutate(inv.id)}
                  >
                    {t("teamspacesPanel.decline", "Decline")}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Your workspace ──────────────────────────────────────── */}
        {workspace && (
          <button
            type="button"
            className={`tsp-row${space.kind === "workspace" ? " is-active" : ""}`}
            onClick={goToWorkspace}
          >
            <span className="tsp-row__icon tsp-row__icon--ws">
              <WorkspaceGlyph ws={workspace} size={15} />
            </span>
            <span className="tsp-row__text">
              <span className="tsp-row__name">{workspace.name}</span>
              <span className="tsp-row__meta">
                {t("teamspacesPanel.yourWorkspace", "Your workspace")}
              </span>
            </span>
            {space.kind === "workspace" && (
              <Check size={15} className="tsp-row__check" />
            )}
          </button>
        )}

        {hosted.length > 0 && (
          <>
            <div className="tsp__label">
              {t("teamspacesPanel.inWorkspace", "In this workspace")}
            </div>
            {hosted.map(renderRow)}
          </>
        )}

        {joined.length > 0 && (
          <>
            <div className="tsp__label">
              {t("teamspacesPanel.joined", "Joined")}
            </div>
            {joined.map(renderRow)}
          </>
        )}

        {teamspaces.length === 0 && invites.length === 0 && (
          <div className="tsp__empty">
            <Users2 size={24} strokeWidth={1.5} />
            <p>
              {t(
                "teamspacesPanel.empty",
                "No teamspaces yet. Create one to work on pages together.",
              )}
            </p>
          </div>
        )}
      </div>

      <div className="tsp__footer">
        <button type="button" className="tsp__create" onClick={onCreate}>
          <Plus size={15} />
          <span>{t("teamspaces.createTeamspace", "Create teamspace")}</span>
        </button>
      </div>
    </div>
  );
}
