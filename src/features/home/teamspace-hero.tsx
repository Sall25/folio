import { useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { JSONContent } from "@tiptap/core";
import type { ID, Page } from "src/types";
import { PageItemIcon } from "../pages/page-item/page-item-icon";
import { useActivePageActions } from "../pages/context/active-page-context";
import { useTeamspaceMemberList } from "src/hooks/use-teamspace-members";
import { TeamspaceMembersModal } from "../workspace/teamspaces/teamspace-members/teamspace-members-modal";
import { colorForPersonId } from "src/lib/person-color";
import { ChevronRight, FileText, UserPlus } from "src/components/icons";
import "./teamspace-hero.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { useAppearance } from "../shell/appearance/appearance";

const MAX_FACES = 5;
const MAX_PINS = 4;
const DESCRIPTION_MAX = 180;

/** The page's first line of text below its title, as a short description. */
function descriptionOf(content: JSONContent | null | undefined): string {
  const textOf = (n: JSONContent): string =>
    n.text ?? (n.content ?? []).map(textOf).join("");
  for (const node of content?.content ?? []) {
    if (node.type === "title") continue;
    const text = textOf(node).trim();
    if (text) {
      return text.length > DESCRIPTION_MAX
        ? `${text.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`
        : text;
    }
  }
  return "";
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/**
 * The teamspace's front door, at the top of Home inside a teamspace: its
 * icon, name and the first line of its page, who's in it, Open page and
 * Invite, and the pages the team pinned, as cards. It wears the teamspace's
 * colour (the parent sets --space-accent).
 */
export function TeamspaceHero({
  teamspaceId,
  page,
  pinned,
  subpages,
}: {
  teamspaceId: ID | null;
  /** The teamspace's root page (name, icon, content). */
  page: Page | null;
  /** The team's pinned pages, in pin order. */
  pinned: Page[];
  subpages: Page[];
}) {
  const { t } = useTranslation();
  const { setActivePageId } = useActivePageActions();
  const { members } = useTeamspaceMemberList(teamspaceId);
  const [membersOpen, setMembersOpen] = useState(false);

  const description = useMemo(
    () => descriptionOf(page?.content as JSONContent | undefined),
    [page?.content],
  );
  const name = page?.title || t("teamspaces.untitled");
  const pins = pinned.slice(0, MAX_PINS);
  const cover = page?.cover;
  const coverBg = cover?.coverImage
    ? `center / cover no-repeat url("${cover.coverImage}")`
    : (cover?.gradient ?? null);
  const list = pins.length > 0 ? pins : subpages.slice(0, MAX_PINS);

  const [appearance] = useAppearance();

  return (
    <Card
      className={`ts-hero ${appearance}`}
      aria-label={name}
      data-has-side={list.length > 0 || undefined}
    >
      {coverBg && appearance === "default" && (
        <div
          className="ts-hero__cover"
          style={{ background: coverBg }}
          aria-hidden
        />
      )}
      <div className="ts-hero__main">
        <span className="ts-hero__icon" aria-hidden>
          {page ? (
            <PageItemIcon
              cover={page.cover}
              styles={{ width: 26, height: 26, fontSize: 26 }}
            />
          ) : null}
        </span>
        <h1 className="ts-hero__name">{name}</h1>
        {description && <p className="ts-hero__desc">{description}</p>}

        {members.length > 0 && (
          <span className="ts-hero__members">
            <span className="ts-hero__faces" aria-hidden>
              {members.slice(0, MAX_FACES).map(({ person }) =>
                person.avatarUrl ? (
                  <img
                    key={person.id}
                    className="ts-hero__face"
                    loading="lazy"
                    decoding="async"
                    src={person.avatarUrl}
                    alt=""
                  />
                ) : (
                  <span
                    key={person.id}
                    className="ts-hero__face"
                    style={
                      { "--face": colorForPersonId(person.id) } as CSSProperties
                    }
                  >
                    {initials(person.name)}
                  </span>
                ),
              )}
            </span>
            {t("home.teamspaceHero.members", { count: members.length })}
          </span>
        )}

        <div className="ts-hero__actions">
          <Button
            type="button"
            className="ts-hero__btn ts-hero__btn--primary"
            onClick={() => page?.id && setActivePageId(page?.id)}
          >
            <FileText size={14} aria-hidden />
            {t("home.teamspaceHero.open")}
          </Button>
          {teamspaceId && (
            <Button
              type="button"
              className="ts-hero__btn"
              onClick={() => setMembersOpen(true)}
            >
              <UserPlus size={14} aria-hidden />
              {t("home.teamspaceHero.invite")}
            </Button>
          )}
        </div>
      </div>

      {list.length > 0 && (
        <div className="ts-hero__pins">
          <span className="ts-hero__pins-label">
            {list.length > 0
              ? t("home.teamspaceHero.pinned")
              : t("home.teamspaceHero.pages")}
          </span>
          <div className="ts-hero__pins-grid">
            {list.map((p) => (
              <Button
                key={p.id}
                type="button"
                className="ts-hero__pin"
                onClick={() => setActivePageId(p.id)}
              >
                <PageItemIcon
                  cover={p.cover}
                  styles={{ width: 18, height: 18, fontSize: 18 }}
                />
                <span className="ts-hero__pin-title">
                  {p.title || t("page.untitled")}
                </span>
                <span className="ts-hero__pin-when">
                  <ChevronRight size={14} />
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {membersOpen && teamspaceId && (
        <TeamspaceMembersModal
          teamspaceId={teamspaceId}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </Card>
  );
}
