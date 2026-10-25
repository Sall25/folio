import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  Trash2,
  Lock,
  Globe,
  Users,
  Building2,
  Link2,
} from "src/components/icons";
import { usePageAccess, useManagePageAccess } from "src/hooks/use-page-access";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { usePeople, usePeopleById } from "src/hooks/use-people";
import { useGroups } from "src/hooks/use-groups";
import { useCurrentPerson } from "src/hooks/use-session";
import { useToast } from "src/features/shell/toast";
import type {
  ID,
  Page,
  PageRole,
  GeneralAccess,
  Person,
  Group,
} from "src/types";
import "./share-panel.scss";
import { PublishTab } from "./publish-tab";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";

// Layers: the panel sits with the other popovers (1100, above the peek and
// center views); its own menus open above it.
const MENU_Z = 1110;

const ROLES: PageRole[] = ["full", "edit", "comment", "view"];

const GENERAL_ICON: Record<GeneralAccess, ReactNode> = {
  private: <Lock size={16} />,
  teamspace: <Users size={16} />,
  workspace: <Building2 size={16} />,
  public: <Globe size={16} />,
};

/** The address to share: the plain page link, which opens for anyone who has
 *  access (it isn't tied to a teamspace view). */
function pageShareUrl(pageId: ID): string {
  return `${window.location.origin}/page/${pageId}`;
}

// A small role dropdown reused for grant rows and general access.
function RoleMenu({
  value,
  onChange,
  onRemove,
  disabled,
}: {
  value: PageRole;
  onChange: (r: PageRole) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="share-role">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="share-role__trigger"
            disabled={disabled}
          >
            {t(`share.roles.${value}`)}
            {!disabled && <ChevronDown size={14} />}
          </button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("root")}>
          <PopoverContent
            side="bottom"
            align="end"
            style={{ position: "fixed", zIndex: MENU_Z }}
          >
            <Card style={{ boxShadow: "var(--tt-shadow-elevated-sm)" }}>
              <div className="share-role__menu" role="menu">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="share-role__item"
                    onClick={() => {
                      if (r !== value) onChange(r);
                      setOpen(false);
                    }}
                  >
                    <span className="share-role__item-text">
                      <span className="share-role__item-label">
                        {t(`share.roles.${r}`)}
                      </span>
                      <span className="share-role__item-desc">
                        {t(`share.roleDescriptions.${r}`)}
                      </span>
                    </span>
                    {r === value && <Check size={15} />}
                  </button>
                ))}
                {onRemove && (
                  <>
                    <div className="share-role__divider" />
                    <button
                      type="button"
                      className="share-role__item is-danger"
                      onClick={() => {
                        onRemove();
                        setOpen(false);
                      }}
                    >
                      <Trash2 size={15} />
                      <span className="share-role__item-label">
                        {t("share.remove")}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </Card>
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </div>
  );
}

function GeneralAccessMenu({
  value,
  options,
  onChange,
  disabled,
}: {
  value: GeneralAccess;
  options: GeneralAccess[];
  onChange: (v: GeneralAccess) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="share-role">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="share-general__trigger"
            disabled={disabled}
          >
            {t(`share.general.${value}`)}
            {!disabled && <ChevronDown size={14} />}
          </button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("root")}>
          <PopoverContent style={{ zIndex: MENU_Z }}>
            <Card>
              <div className="share-role__menu" role="menu">
                {options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="share-role__item"
                    onClick={() => {
                      if (o !== value) onChange(o);
                      setOpen(false);
                    }}
                  >
                    <span className="share-role__item-icon">
                      {GENERAL_ICON[o]}
                    </span>
                    <span className="share-role__item-text">
                      <span className="share-role__item-label">
                        {t(`share.general.${o}`)}
                      </span>
                      <span className="share-role__item-desc">
                        {t(`share.generalDescriptions.${o}`)}
                      </span>
                    </span>
                    {o === value && <Check size={15} />}
                  </button>
                ))}
              </div>
            </Card>
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </div>
  );
}

function SharePanelInner({ page }: { page: Page }) {
  const { t } = useTranslation();
  const { show } = useToast();
  const { person } = useCurrentPerson();
  const { data: grants = [] } = usePageAccess(page.id);
  const { data: people = [] } = usePeople();
  const { data: groups = [] } = useGroups();
  // Names for everyone with access — including teamspace members from
  // another workspace, who aren't in this workspace's people list.
  const grantPersonIds = useMemo(
    () =>
      grants.filter((g) => g.subjectType === "person").map((g) => g.subjectId),
    [grants],
  );
  const peopleById = usePeopleById(grantPersonIds);
  const { share, changeRole, unshare, setGeneralAccess } = useManagePageAccess(
    page.id,
  );
  // Your real role on the page, from the server (page owners, full grants,
  // teamspace and workspace rules all count) — only "Full access" shares.
  const { canManageAccess: canManage } = usePageCapabilities(page.id);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"share" | "publish">("share");

  // Resolve the current grants to displayable rows (name + email/label).
  const rows = useMemo(() => {
    return grants.map((g) => {
      if (g.subjectType === "person") {
        const p = peopleById.get(g.subjectId);
        return {
          grant: g,
          name: p?.name ?? t("share.unknownPerson"),
          sub: p?.email ?? "",
          isYou: g.subjectId === person?.id,
        };
      }
      const gr = ((groups as Group[]) ?? []).find((x) => x.id === g.subjectId);
      return {
        grant: g,
        name: gr?.name ?? t("share.unknownGroup"),
        sub: t("share.memberCount", { count: gr?.memberIds.length ?? 0 }),
        isYou: false,
      };
    });
  }, [grants, peopleById, groups, person, t]);

  // Typed-text suggestions: people by email/name, groups by name, that
  // aren't already granted (and never yourself).
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const grantedPersonIds = new Set(
      grants.filter((g) => g.subjectType === "person").map((g) => g.subjectId),
    );
    const grantedGroupIds = new Set(
      grants.filter((g) => g.subjectType === "group").map((g) => g.subjectId),
    );
    const peopleHits = ((people as Person[]) ?? [])
      .filter(
        (p) =>
          p.id !== person?.id &&
          !grantedPersonIds.has(p.id) &&
          (p.email.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q)),
      )
      .slice(0, 4)
      .map((p) => ({
        type: "person" as const,
        id: p.id,
        label: p.name,
        sub: p.email,
      }));
    const groupHits = ((groups as Group[]) ?? [])
      .filter(
        (g) => !grantedGroupIds.has(g.id) && g.name.toLowerCase().includes(q),
      )
      .slice(0, 3)
      .map((g) => ({
        type: "group" as const,
        id: g.id,
        label: g.name,
        sub: t("share.group"),
      }));
    return [...peopleHits, ...groupHits];
  }, [query, people, groups, grants, person, t]);

  const addGrant = (subjectType: "person" | "group", subjectId: ID) => {
    share.mutate({ subjectType, subjectId, role: "edit" });
    setQuery("");
  };

  // "Everyone in the teamspace" only makes sense for a page in one.
  const generalOptions = useMemo<GeneralAccess[]>(
    () =>
      page.teamspaceId
        ? ["private", "teamspace", "workspace", "public"]
        : ["private", "workspace", "public"],
    [page.teamspaceId],
  );

  const copyLink = async () => {
    const url = pageShareUrl(page.id);
    try {
      await navigator.clipboard.writeText(url);
      show(t("share.linkCopied"), "success");
    } catch {
      show(url, "info"); // clipboard refused — at least show the address
    }
  };

  const trimmed = query.trim();

  return (
    <div className="share-panel">
      <div className="share-panel__tabs" role="tablist">
        <button
          className={`share-panel__tab${tab === "share" ? " is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={tab === "share"}
          onClick={() => setTab("share")}
        >
          {t("share.share", "Share")}
        </button>
        <button
          className={`share-panel__tab${tab === "publish" ? " is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={tab === "publish"}
          onClick={() => setTab("publish")}
        >
          {t("publish.tab")}
          {page.publishedAt && (
            <span className="share-panel__tab-dot" aria-hidden />
          )}
        </button>
      </div>

      {tab === "publish" ? (
        <PublishTab page={page} canManage={canManage} />
      ) : (
        <>
          {canManage ? (
            <div className="share-panel__add">
              <input
                className="share-panel__input"
                placeholder={t("share.addPlaceholder")}
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions[0]) {
                    e.preventDefault();
                    addGrant(suggestions[0].type, suggestions[0].id);
                  }
                  if (e.key === "Escape" && query) {
                    e.stopPropagation();
                    setQuery("");
                  }
                }}
              />
              {trimmed &&
                (suggestions.length > 0 ? (
                  <div className="share-panel__suggest">
                    {suggestions.map((s) => (
                      <button
                        key={`${s.type}:${s.id}`}
                        type="button"
                        className="share-panel__suggest-item"
                        onClick={() => addGrant(s.type, s.id)}
                      >
                        <span className="share-panel__suggest-label">
                          {s.label}
                        </span>
                        <span className="share-panel__suggest-sub">
                          {s.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="share-panel__suggest">
                    <div className="share-panel__suggest-empty">
                      {t("share.noMatch")}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="share-panel__readonly">{t("share.readOnly")}</div>
          )}

          {rows.length > 0 && (
            <div className="share-panel__list">
              {rows.map(({ grant, name, sub, isYou }) => (
                <div key={grant.id} className="share-row">
                  <div className="share-row__avatar">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="share-row__text">
                    <span className="share-row__name">
                      {name}
                      {isYou && (
                        <span className="share-row__you">
                          {" "}
                          {t("share.you")}
                        </span>
                      )}
                    </span>
                    {sub && <span className="share-row__sub">{sub}</span>}
                  </div>
                  <RoleMenu
                    value={grant.role}
                    disabled={!canManage || isYou}
                    onChange={(r) =>
                      changeRole.mutate({ id: grant.id, role: r })
                    }
                    onRemove={
                      canManage && !isYou
                        ? () => unshare.mutate(grant.id)
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* General access */}
          <div className="share-panel__general">
            <div className="share-panel__general-label">
              {t("share.generalAccess", "General access")}
            </div>
            <div className="share-row">
              <div className="share-row__avatar is-icon">
                {GENERAL_ICON[page.generalAccess]}
              </div>
              <div className="share-row__text">
                <GeneralAccessMenu
                  value={page.generalAccess}
                  options={generalOptions}
                  disabled={!canManage}
                  onChange={(ga) =>
                    setGeneralAccess.mutate({ generalAccess: ga })
                  }
                />
                <span className="share-row__sub">
                  {t(`share.generalDescriptions.${page.generalAccess}`)}
                </span>
              </div>
              {page.generalAccess !== "private" && (
                <RoleMenu
                  value={page.generalAccessRole}
                  disabled={!canManage}
                  onChange={(r) =>
                    setGeneralAccess.mutate({ generalAccessRole: r })
                  }
                />
              )}
            </div>
          </div>

          <div className="share-panel__footer">
            <button
              type="button"
              className="share-panel__copy"
              onClick={copyLink}
            >
              <Link2 size={15} />
              <span>{t("share.copyLink")}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Anchored under its trigger, portaled to body. Follows the trigger on
// scroll / resize, and closes when you click outside or press Escape.
export function SharePanel({
  page,
  anchorRef,
  open,
  onClose,
}: {
  page: Page;
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, place, onClose]);

  if (!open || !pos) return null;

  return createPortal(
    <>
      <div className="share-panel__backdrop" onClick={onClose} />
      <div
        className="share-panel__pop"
        style={{ top: pos.top, right: pos.right }}
      >
        {/* Keyed by page: switching pages starts with a clean panel. */}
        <SharePanelInner key={page.id} page={page} />
      </div>
    </>,
    document.body,
  );
}
