import { useMemo, useRef, useState, type ReactNode } from "react";
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
} from "lucide-react";
import { usePageAccess, useManagePageAccess } from "src/hooks/use-page-access";
import { usePeople } from "src/hooks/use-people";
import { useGroups } from "src/hooks/use-groups";
import { useCurrentPerson } from "src/hooks/use-session";
import type {
  ID,
  Page,
  PageRole,
  GeneralAccess,
  Person,
  Group,
} from "src/types";
import "./share-panel.scss";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";

const ROLE_LABELS: Record<PageRole, string> = {
  full: "Full access",
  edit: "Can edit",
  comment: "Can comment",
  view: "Can view",
};

const ROLE_DESCRIPTIONS: Record<PageRole, string> = {
  full: "Edit, suggest, comment, and share",
  edit: "Edit, suggest, and comment",
  comment: "Suggest and comment",
  view: "View only",
};

const GENERAL_LABELS: Record<GeneralAccess, string> = {
  private: "Only people invited",
  teamspace: "Everyone in the teamspace",
  workspace: "Everyone in the workspace",
  public: "Anyone with the link",
};

const GENERAL_ICON: Record<GeneralAccess, ReactNode> = {
  private: <Lock size={16} />,
  teamspace: <Users size={16} />,
  workspace: <Building2 size={16} />,
  public: <Globe size={16} />,
};

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
  const [open, setOpen] = useState(false);
  const roles: PageRole[] = ["full", "edit", "comment", "view"];

  return (
    <div className="share-role">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="share-role__trigger"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
          >
            {ROLE_LABELS[value]}
            <ChevronDown size={14} />
          </button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("root")}>
          <PopoverContent
            side="top"
            align="start"
            style={{ position: "fixed", zIndex: 99999 }}
          >
            <Card style={{ boxShadow: "var(--tt-shadow-elevated-sm)" }}>
              <div className="share-role__menu" role="menu">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="share-role__item"
                    onClick={() => {
                      onChange(r);
                      setOpen(false);
                    }}
                  >
                    <span className="share-role__item-text">
                      <span className="share-role__item-label">
                        {ROLE_LABELS[r]}
                      </span>
                      <span className="share-role__item-desc">
                        {ROLE_DESCRIPTIONS[r]}
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
                      <span className="share-role__item-label">Remove</span>
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

function SharePanelInner({ page }: { page: Page }) {
  const { t } = useTranslation();
  const { person } = useCurrentPerson();
  const { data: grants = [] } = usePageAccess(page.id);
  const { data: people = [] } = usePeople();
  const { data: groups = [] } = useGroups();
  const { share, changeRole, unshare, setGeneralAccess } = useManagePageAccess(
    page.id,
  );

  const [query, setQuery] = useState("");

  // Only full-access may change sharing (Notion). Everyone else sees read-only.
  const myRole = useMemo<PageRole | null>(() => {
    // The current user's effective role isn't in `grants` if it comes from
    // general access; treat page ownership / a full grant as the gate. A
    // dedicated "my effective role" query would be more precise, but for the
    // panel, a full grant or workspace-owner is the share gate.
    const mine = grants.find(
      (g) => g.subjectType === "person" && g.subjectId === person?.id,
    );
    if (mine) return mine.role;
    if (person?.role === "owner") return "full";
    return null;
  }, [grants, person]);

  const canManage = myRole === "full" || person?.role === "owner";

  // Resolve the current grants to displayable rows (name + email/label).
  const rows = useMemo(() => {
    return grants.map((g) => {
      if (g.subjectType === "person") {
        const p = ((people as Person[]) ?? []).find(
          (x) => x.id === g.subjectId,
        );
        return {
          grant: g,
          name: p?.name ?? "Unknown",
          sub: p?.email ?? "",
          isYou: p?.id === person?.id,
        };
      }
      const gr = ((groups as Group[]) ?? []).find((x) => x.id === g.subjectId);
      return {
        grant: g,
        name: gr?.name ?? "Unknown group",
        sub: `${gr?.memberIds.length ?? 0} members`,
        isYou: false,
      };
    });
  }, [grants, people, groups, person]);

  // Typed-text suggestions: match people by email/name, groups by name, that
  // aren't already granted.
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
        sub: "Group",
      }));
    return [...peopleHits, ...groupHits];
  }, [query, people, groups, grants]);

  const addGrant = (subjectType: "person" | "group", subjectId: ID) => {
    share.mutate({ subjectType, subjectId, role: "edit" });

    setQuery("");
  };

  return (
    <div className="share-panel">
      {/* Tabs (Publish stubbed) */}
      <div className="share-panel__tabs">
        <button className="share-panel__tab is-active" type="button">
          {t("share.share", "Share")}
        </button>
        <button
          className="share-panel__tab"
          type="button"
          disabled
          title="Coming soon"
        >
          {t("share.publish", "Publish")}
        </button>
      </div>

      {/* Add input */}
      {canManage && (
        <div className="share-panel__add">
          <input
            className="share-panel__input"
            placeholder={t("share.addPlaceholder", "Email or group…")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="share-panel__suggest">
              {suggestions.map((s) => (
                <button
                  key={`${s.type}:${s.id}`}
                  type="button"
                  className="share-panel__suggest-item"
                  onClick={() => addGrant(s.type, s.id)}
                >
                  <span className="share-panel__suggest-label">{s.label}</span>
                  <span className="share-panel__suggest-sub">{s.sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grant rows */}
      <div className="share-panel__list">
        {rows.map(({ grant, name, sub, isYou }) => (
          <div key={grant.id} className="share-row">
            <div className="share-row__avatar">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="share-row__text">
              <span className="share-row__name">
                {name}
                {isYou && <span className="share-row__you"> (You)</span>}
              </span>
              {sub && <span className="share-row__sub">{sub}</span>}
            </div>
            <RoleMenu
              value={grant.role}
              disabled={!canManage || isYou}
              onChange={(r) => changeRole.mutate({ id: grant.id, role: r })}
              onRemove={
                canManage && !isYou ? () => unshare.mutate(grant.id) : undefined
              }
            />
          </div>
        ))}
      </div>

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
              disabled={!canManage}
              onChange={(ga) => setGeneralAccess.mutate({ generalAccess: ga })}
            />
            <span className="share-row__sub">
              {GENERAL_LABELS[page.generalAccess]}
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
    </div>
  );
}

function GeneralAccessMenu({
  value,
  onChange,
  disabled,
}: {
  value: GeneralAccess;
  onChange: (v: GeneralAccess) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const opts: GeneralAccess[] = ["private", "teamspace", "workspace", "public"];

  return (
    <div className="share-role">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="share-general__trigger"
            disabled={disabled}
          >
            {value === "private"
              ? "Only people invited"
              : value === "teamspace"
                ? "Teamspace"
                : value === "workspace"
                  ? "Workspace"
                  : "Anyone with link"}
            <ChevronDown size={14} />
          </button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("root")}>
          <PopoverContent style={{ zIndex: 99999 }}>
            <Card>
              <div className="share-role__menu" role="menu">
                {opts.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="share-role__item"
                    onClick={() => {
                      onChange(o);
                      setOpen(false);
                    }}
                  >
                    <span className="share-role__item-icon">
                      {GENERAL_ICON[o]}
                    </span>
                    <span className="share-role__item-label">
                      {GENERAL_LABELS[o]}
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

// Popover wrapper — anchors under a trigger, portals to body.
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
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    if (!open || !anchorRef.current) return;
    // eslint-disable-next-line react-hooks/refs
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }, [open, anchorRef]);

  if (!open || !pos) return null;

  return createPortal(
    <>
      <div className="share-panel__backdrop" onClick={onClose} />
      <div
        ref={ref}
        className="share-panel__pop"
        style={{ top: pos.top, right: pos.right }}
      >
        <SharePanelInner page={page} />
      </div>
    </>,
    document.body,
  );
}
