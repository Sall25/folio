import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { Trash2 } from "src/components/icons";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { AccentSwatches } from "src/components/accent-swatches/accent-swatches";
import { ConfirmDialog } from "src/features/shell/confirm-dialog";
import { useToast } from "src/features/shell/toast";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useCurrentPerson } from "src/hooks/use-session";
import { useManageTeamspaces, useTeamspaces } from "src/hooks/use-teamspaces";
import { usePagesByCategory } from "src/hooks/use-pages";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import {
  Select,
  SettingRow,
  WorkspaceIconField,
} from "../../settings/workspace-settings-content";
import type { Page, PageCover, Teamspace, TeamspaceAccess } from "src/types";
import "../../settings/workspace-settings-content.scss";
import "./teamspace-general-content.scss";

const ACCESS: TeamspaceAccess[] = ["open", "closed", "private"];

/**
 * A teamspace's own settings (Teamspace settings → Settings): icon, name,
 * description, access, colour, and deleting it. Only its owners can change
 * anything (the teamspaces_update policy and the page's own rights); everyone
 * else sees the same rows, read-only.
 */
export function TeamspaceGeneralContent({
  teamspaceId,
  onDeleted,
}: {
  teamspaceId: string;
  /** Called once the teamspace is gone (the modal closes). */
  onDeleted?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const space = useCurrentSpace();
  const { person } = useCurrentPerson();
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: teamspacePages = [] } = usePagesByCategory("Teamspaces");
  const {
    renameTeamspaceAsync,
    setDescriptionAsync,
    setAccessAsync,
    setAccentColorAsync,
    deleteTeamspaceAsync,
  } = useManageTeamspaces();
  const patchPageMut = usePatchPage(({ id, patch }) => patchPage(id, patch));

  // The record (access, members, colour) and the page (name, icon) share
  // the teamspace's id.
  const ts = useMemo(
    () => (teamspaces as Teamspace[]).find((x) => x.id === teamspaceId),
    [teamspaces, teamspaceId],
  );
  const page = useMemo(
    () => (teamspacePages as Page[]).find((p) => p.id === teamspaceId),
    [teamspacePages, teamspaceId],
  );

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ts || !page) {
    return (
      <div className="ws-settings-content__empty">
        {t("settings.workspace.loading", "Loading…")}
      </div>
    );
  }

  const isOwner = !!person && ts.ownerIds.includes(person.id);
  const name = page.title || t("teamspaces.untitled");

  const commitName = () => {
    const next = (nameDraft ?? page.title).trim();
    setNameDraft(null);
    if (isOwner && next && next !== page.title) {
      void renameTeamspaceAsync(ts.id, next);
    }
  };

  const commitDescription = () => {
    const next = (descDraft ?? ts.description ?? "").trim();
    setDescDraft(null);
    if (isOwner && next !== (ts.description ?? "")) {
      void setDescriptionAsync(ts.id, next || null);
    }
  };

  const setIcon = (
    iconName: string | null,
    color?: string | null,
    target?: string | null,
  ) => {
    if (!isOwner) return;
    patchPageMut.mutate({
      id: page.id,
      patch: {
        cover: {
          ...page.cover,
          iconName,
          color: iconName ? (color ?? null) : null,
          target: iconName
            ? ((target ?? "Icons") as PageCover["target"])
            : null,
        },
      },
    });
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    // Step out of the teamspace before it disappears under us.
    if (space.kind === "teamspace" && space.id === ts.id) navigate({ to: "/" });
    try {
      await deleteTeamspaceAsync(ts.id);
      show(t("teamspaces.deleted"), "success");
      onDeleted?.();
    } catch (err) {
      show(
        err instanceof Error && err.message
          ? err.message
          : t("teamspaces.deleteFailed"),
        "error",
      );
    }
  };

  return (
    <div className="ws-settings-content">
      {!isOwner && (
        <div className="ws-settings-content__notice">
          {t(
            "teamspaceSettings.readOnly",
            "Only the teamspace's owners can change these settings.",
          )}
        </div>
      )}

      <SettingRow
        label={t("teamspaceSettings.icon", "Icon")}
        description={t(
          "teamspaceSettings.iconDesc",
          "Shown next to the teamspace's name in the sidebar.",
        )}
      >
        <WorkspaceIconField
          icon={page.cover.iconName}
          iconColor={page.cover.color}
          iconTarget={page.cover.target}
          disabled={!isOwner}
          onSelect={(iconName, color, target) =>
            setIcon(iconName, color, target)
          }
          onRemove={() => setIcon(null)}
        />
      </SettingRow>

      <SettingRow
        label={t("teamspaceSettings.name", "Name")}
        description={t(
          "teamspaceSettings.nameDesc",
          "The teamspace's name, shown in the sidebar and on its Home.",
        )}
      >
        <Input
          value={nameDraft ?? page.title}
          disabled={!isOwner}
          onChange={(e) => setNameDraft(e.currentTarget.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </SettingRow>

      <SettingRow
        stacked
        label={t("teamspaceSettings.description", "Description")}
        description={t(
          "teamspaceSettings.descriptionDesc",
          "What the teamspace is for. Shown in the list of teamspaces.",
        )}
      >
        <textarea
          className="ts-general__textarea"
          rows={3}
          value={descDraft ?? ts.description ?? ""}
          disabled={!isOwner}
          placeholder={t(
            "teamspaceSettings.descriptionPlaceholder",
            "Add a description",
          )}
          onChange={(e) => setDescDraft(e.currentTarget.value)}
          onBlur={commitDescription}
        />
      </SettingRow>

      <Separator orientation="horizontal" />

      <SettingRow
        label={t("teamspaceSettings.access", "Access")}
        description={t(
          `teamspaceSettings.accessDesc_${ts.access}`,
          ts.access === "open"
            ? "Anyone in the workspace can find and join it."
            : ts.access === "closed"
              ? "Anyone can see it; members join by invitation."
              : "Only its members can see it.",
        )}
      >
        <Select<TeamspaceAccess>
          value={ts.access}
          disabled={!isOwner}
          onChange={(a) => void setAccessAsync(ts.id, a)}
          options={ACCESS.map((a) => ({
            value: a,
            label: t(`teamspaces.access.${a}`),
          }))}
        />
      </SettingRow>

      <SettingRow
        stacked
        label={t("teamspaceSettings.color", "Colour")}
        description={t(
          "teamspaceSettings.colorDesc",
          "Used for its sidebar tile, its Home banner, New page, tabs and links. Automatic follows the icon's colour.",
        )}
      >
        <AccentSwatches
          value={ts.accentColor ?? null}
          onChange={(c) => void setAccentColorAsync(ts.id, c)}
          autoLabel={t("teamspaces.colorAuto", "Match icon")}
          disabled={!isOwner}
        />
      </SettingRow>

      {isOwner && (
        <>
          <Separator orientation="horizontal" />
          <div className="ws-settings-content__danger">
            <SettingRow
              label={t("teamspaceSettings.delete", "Delete teamspace")}
              description={t("teamspaces.deleteConfirmBody")}
            >
              <Button
                variant="ghost"
                style={{ color: "var(--tt-color-red-dec-2, #e5484d)" }}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">
                  {t("teamspaces.deleteConfirmAction")}
                </span>
              </Button>
            </SettingRow>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        message={
          <>
            {t("teamspaces.deleteConfirmTitle", { name })}
            <br />
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              {t("teamspaces.deleteConfirmBody")}
            </span>
          </>
        }
        confirmLabel={t("teamspaces.deleteConfirmAction")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
