import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { setPageGeneralAccessTree } from "src/api/page-access-tree";
import { queryKeys } from "src/lib/queryKeys";
import { usePage } from "src/hooks/use-pages";
import { useToast } from "src/features/shell/toast";
import type { PageRole } from "src/types";
import {
  closeTeamspaceMove,
  useTeamspaceMoveRequest,
  type TeamspaceMoveRequest,
} from "./teamspace-move-store";
import "./teamspace-move-dialog.scss";

// Moving a page into a teamspace: who can open it, and every page inside it
// (they all get the same). Everyone in the teamspace (with a role), only the
// people invited, or each page keeps what it has. Same look as the confirm
// dialog. Mounted once (app-overlays.tsx); opened by requestTeamspaceMove.

type Choice = "teamspace" | "private" | "keep";
const ROLES: PageRole[] = ["view", "comment", "edit", "full"];

export function TeamspaceMoveDialog() {
  const request = useTeamspaceMoveRequest();
  if (!request) return null;
  return <MoveDialog key={request.pageId} request={request} />;
}

function MoveDialog({ request }: { request: TeamspaceMoveRequest }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { show } = useToast();
  const [choice, setChoice] = useState<Choice>("teamspace");
  const [role, setRole] = useState<PageRole>("edit");
  const [busy, setBusy] = useState(false);
  // A teamspace's name is its root page's title.
  const { data: page } = usePage(request.pageId);
  const { data: teamspacePage } = usePage(request.teamspaceId);
  const pageTitle = page?.title || t("page.untitled");
  const teamspaceName = teamspacePage?.title || t("teamspaceMove.theTeamspace");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) closeTeamspaceMove();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy]);

  const confirm = async () => {
    setBusy(true);
    try {
      await request.move();
      if (choice !== "keep") {
        await setPageGeneralAccessTree(
          request.pageId,
          choice,
          choice === "teamspace" ? role : "view",
        );
      }
    } catch (error) {
      console.error("Move into teamspace failed:", error);
      show(t("teamspaceMove.failed"), "error");
    } finally {
      void qc.invalidateQueries({ queryKey: queryKeys.pages.all });
      void qc.invalidateQueries({ queryKey: ["page-role"] });
      setBusy(false);
      closeTeamspaceMove();
    }
  };

  return createPortal(
    <div
      role="presentation"
      className="ts-move"
      onClick={(e) => {
        e.stopPropagation();
        if (!busy) closeTeamspaceMove();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ts-move-title"
        className="ts-move__card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ts-move-title" className="ts-move__title">
          {t("teamspaceMove.title", {
            page: pageTitle,
            teamspace: teamspaceName,
          })}
        </h2>
        <p className="ts-move__lead">{t("teamspaceMove.lead")}</p>

        <fieldset className="ts-move__options">
          <legend className="ts-move__sr">{t("teamspaceMove.lead")}</legend>

          <label className="ts-move__option" data-checked={choice === "teamspace" || undefined}>
            <input
              type="radio"
              name="ts-move-access"
              checked={choice === "teamspace"}
              onChange={() => setChoice("teamspace")}
            />
            <span className="ts-move__option-text">
              <b>
                {t("teamspaceMove.everyone", { teamspace: teamspaceName })}
              </b>
              <small>{t("teamspaceMove.everyoneHint")}</small>
            </span>
            <select
              className="ts-move__role"
              aria-label={t("teamspaceMove.role")}
              value={role}
              disabled={choice !== "teamspace"}
              onChange={(e) => setRole(e.target.value as PageRole)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`share.roles.${r}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="ts-move__option" data-checked={choice === "private" || undefined}>
            <input
              type="radio"
              name="ts-move-access"
              checked={choice === "private"}
              onChange={() => setChoice("private")}
            />
            <span className="ts-move__option-text">
              <b>{t("share.general.private")}</b>
              <small>{t("teamspaceMove.privateHint")}</small>
            </span>
          </label>

          <label className="ts-move__option" data-checked={choice === "keep" || undefined}>
            <input
              type="radio"
              name="ts-move-access"
              checked={choice === "keep"}
              onChange={() => setChoice("keep")}
            />
            <span className="ts-move__option-text">
              <b>{t("teamspaceMove.keep")}</b>
              <small>{t("teamspaceMove.keepHint")}</small>
            </span>
          </label>
        </fieldset>

        <CardItemGroup orientation="horizontal" className="ts-move__actions">
          <Button
            variant="ghost"
            className="ts-move__cancel"
            disabled={busy}
            onClick={() => closeTeamspaceMove()}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            className="ts-move__confirm"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {t("teamspaceMove.move")}
          </Button>
        </CardItemGroup>
      </div>
    </div>,
    document.body,
  );
}
