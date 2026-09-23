import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { Check, Plus, Users2 } from "lucide-react";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useGroups } from "src/hooks/use-groups";
import {
  useEnterableTeamspaces,
  type EnterableTeamspace,
} from "src/hooks/use-enterable-teamspaces";
import { effectiveMemberCount, type Group } from "src/types";
import { PageItemIcon } from "../../page-item-icon";
import { WorkspaceGlyph } from "../../workspace-switcher-popover";
import "./teamspaces-panel.scss";

interface TeamspacesPanelProps {
  /** Called after a space was picked (closes the popover). */
  onDone: () => void;
  /** Open the create-teamspace modal (owned by the caller, so it survives
   *  the popover closing). */
  onCreate: () => void;
}

// Lists the spaces you can be in: your workspace first, then teamspaces —
// those hosted by your workspace, and ones you've joined elsewhere. Picking a
// teamspace enters it (a URL change, /t/:id); picking your workspace leaves
// the teamspace.
export function TeamspacesPanel({ onDone, onCreate }: TeamspacesPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const space = useCurrentSpace();
  const { workspace } = useCurrentWorkspace();
  const { data: groups = [] } = useGroups();
  const teamspaces = useEnterableTeamspaces();

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

  const renderRow = ({ page, record }: EnterableTeamspace) => {
    const active = space.kind === "teamspace" && space.id === page.id;
    const members = effectiveMemberCount(record, groups as Group[]);
    return (
      <button
        key={page.id}
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
        {/* Your workspace — the way back out of any teamspace. */}
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

        {teamspaces.length === 0 && (
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
