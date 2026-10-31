import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { MenuRow } from "src/features/database/components/menu-row";
import { createIcon } from "src/components/icons";
import { useMyWorkspaces } from "src/hooks/use-workspaces";
import { useTeamspaces } from "src/hooks/use-teamspaces";
import { useCurrentPerson } from "src/hooks/use-session";
import {
  useMoveTeamspace,
  useSetTeamspacePlacement,
  useTeamspacePlacements,
} from "src/hooks/use-teamspace-placements";
import type { ID, Teamspace } from "src/types";
import "./teamspace-placement-menu.scss";

// A teamspace's "Show in" row (its sidebar ••• menu): which workspaces'
// sidebars show it, for you — its home workspace always does — and, for
// owners, "Move to…", which changes its home for everyone (migration 050).

const ShowInIcon = createIcon("TeamspaceShowIn", "view_sidebar");

export function TeamspacePlacementMenu({ teamspaceId }: { teamspaceId: ID }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirmMove, setConfirmMove] = useState<ID | null>(null);
  const { workspaces } = useMyWorkspaces();
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: placements } = useTeamspacePlacements();
  const { person } = useCurrentPerson();
  const setPlacement = useSetTeamspacePlacement();
  const move = useMoveTeamspace();

  const ts = (teamspaces as Teamspace[])?.find((x) => x.id === teamspaceId);
  if (!ts || workspaces.length < 2) return null;

  const home = ts.workspaceId;
  const placed = new Set(
    (placements ?? [])
      .filter((p) => p.teamspaceId === teamspaceId)
      .map((p) => p.workspaceId),
  );
  const shownCount = workspaces.filter(
    (w) => w.id === home || placed.has(w.id),
  ).length;
  const isOwner = !!person && ts.ownerIds.includes(person.id);
  const others = workspaces.filter((w) => w.id !== home);
  const target = workspaces.find((w) => w.id === confirmMove);

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmMove(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          style={{ width: "100%", justifyContent: "flex-start", gap: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ShowInIcon className="tiptap-button-icon" />
          <span className="tiptap-button-text">
            {t("teamspacePlacement.showIn")}
          </span>
          <span className="teamspace-placement__count">{shownCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={8}
        style={{ zIndex: 9600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="teamspace-placement">
          <CardGroupLabel>{t("teamspacePlacement.title")}</CardGroupLabel>
          <CardItemGroup orientation="vertical">
            {workspaces.map((w) => {
              const isHome = w.id === home;
              return (
                <MenuRow
                  key={w.id}
                  label={w.name}
                  sub={isHome ? t("teamspacePlacement.home") : undefined}
                  selected={isHome || placed.has(w.id)}
                  disabled={isHome || setPlacement.isPending}
                  onClick={() =>
                    setPlacement.mutate({
                      teamspaceId,
                      workspaceId: w.id,
                      on: !placed.has(w.id),
                    })
                  }
                />
              );
            })}
          </CardItemGroup>

          {isOwner && others.length > 0 && (
            <>
              <Separator orientation="horizontal" />
              <CardGroupLabel>{t("teamspacePlacement.moveTo")}</CardGroupLabel>
              {target ? (
                <div className="teamspace-placement__confirm">
                  <p>
                    {t("teamspacePlacement.moveConfirm", { name: target.name })}
                  </p>
                  <div className="teamspace-placement__confirm-actions">
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmMove(null)}
                    >
                      {t("actions.cancel")}
                    </Button>
                    <Button
                      variant="primary"
                      disabled={move.isPending}
                      onClick={() =>
                        move.mutate(
                          { teamspaceId, workspaceId: target.id },
                          { onSuccess: () => setConfirmMove(null) },
                        )
                      }
                    >
                      {t("teamspacePlacement.move")}
                    </Button>
                  </div>
                </div>
              ) : (
                <CardItemGroup orientation="vertical">
                  {others.map((w) => (
                    <MenuRow
                      key={w.id}
                      label={w.name}
                      onClick={() => setConfirmMove(w.id)}
                    />
                  ))}
                </CardItemGroup>
              )}
            </>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
