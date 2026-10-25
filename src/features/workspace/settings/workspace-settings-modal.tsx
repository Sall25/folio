import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Sparkles, X } from "src/components/icons";
import {
  DEFAULT_SETTINGS_NAV,
  type SettingsNavItem,
  type SettingsNavSection,
} from "./workspace-settings-nav";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import "./workspace-settings-modal.scss";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { useIsMobile } from "src/hooks/use-breakpoint";

function findItem(
  nav: SettingsNavSection[],
  id: string,
): SettingsNavItem | undefined {
  for (const s of nav) {
    const it = s.items.find((i) => i.id === id);
    if (it) return it;
  }
  return undefined;
}

export interface WorkspaceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  /** Controlled active nav id. Omit to let the modal manage it internally. */
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Content header title — defaults to the active nav item's label. */
  title?: string;
  /** Right-aligned slot in the content header (e.g. a "Learn more" link). */
  headerAction?: ReactNode;
  /** The content pane body for the active section. */
  children?: ReactNode;
  /** Account identity shown at the top of the nav. */
  account?: { name: string; email: string; avatarUrl?: string };
  /** The nav sections. Default: your account, then the workspace. */
  nav?: SettingsNavSection[];
  /**
   * Whether the current user is present on some live collaborative
   * connection (a page's HocuspocusProvider) — this modal has no provider
   * of its own, so the caller must derive this itself, e.g. from whichever
   * page was open when settings was invoked. Omit if there's no meaningful
   * connection to check; the dot simply won't render.
   */
  online?: boolean;
}

export function WorkspaceSettingsModal({
  open,
  onClose,
  activeId,
  onSelect,
  title,
  headerAction,
  children,
  account = { name: "Workspace", email: "" },
  online,
  nav = DEFAULT_SETTINGS_NAV,
}: WorkspaceSettingsModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [internalActive, setInternalActive] = useState("people");
  const active = activeId ?? internalActive;

  // Mobile shows ONE pane at a time — nav list, or content, never a fixed
  // side-by-side split (there's no room for it). Selecting a nav item
  // switches to content; a back chevron in the content header returns to
  // the nav list, distinct from the X, which fully closes the modal.
  const [mobileShowContent, setMobileShowContent] = useState(false);

  // Reopening the modal (or switching to/from mobile mid-session, e.g.
  // rotating a tablet) always starts back at the nav list, not wherever it
  // was left — avoids landing on content with no visible way back if the
  // previous session's active id no longer resolves to anything.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setMobileShowContent(false);
  }, [open]);

  const select = (id: string) => {
    onSelect?.(id);
    if (activeId === undefined) setInternalActive(id);
    if (isMobile) setMobileShowContent(true);
  };

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const activeItem = findItem(nav, active);
  const activeLabel = activeItem
    ? (activeItem.label ?? t(activeItem.labelKey))
    : "";

  // On mobile, each pane is shown/hidden via a class rather than unmounted —
  // keeps content state (scroll position, form drafts) alive when flipping
  // back to the nav and forward again, same reasoning AuthGate's skeletons
  // use overlay-not-swap for.
  const navPaneClass = isMobile
    ? `ws-settings__nav${mobileShowContent ? " ws-settings__nav--hidden-mobile" : ""}`
    : "ws-settings__nav";
  const contentPaneClass = isMobile
    ? `ws-settings__content${mobileShowContent ? "" : " ws-settings__content--hidden-mobile"}`
    : "ws-settings__content";

  return (
    <>
      <div className="ws-settings__backdrop" onClick={onClose} />

      <div
        className={`ws-settings${isMobile ? " ws-settings--mobile" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.modalAria")}
      >
        {/* ── Left nav (full-screen pane on mobile) ────────────────────── */}
        <aside className={navPaneClass}>
          {isMobile && (
            <div className="ws-settings__mobile-nav-header">
              <span className="ws-settings__mobile-nav-title">
                {t("settings.title")}
              </span>
              <button
                type="button"
                className="ws-settings__close ws-settings__close--inline"
                aria-label={t("settings.closeAria")}
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Account identity */}
          <div className="ws-settings__account">
            <Avatar
              src={account.avatarUrl}
              name={account.name}
              online={online}
            />
            <div className="ws-settings__account-text">
              <span className="ws-settings__account-name">{account.name}</span>
              {account.email && (
                <span className="ws-settings__account-email">
                  {account.email}
                </span>
              )}
            </div>
          </div>

          <div className="ws-settings__nav-scroll">
            {nav.map((section, i) => (
              <div
                className="ws-settings__nav-section"
                key={section.label ?? section.labelKey ?? i}
              >
                {(section.label || section.labelKey) && (
                  <span className="ws-settings__nav-label">
                    {section.label ?? t(section.labelKey!)}
                  </span>
                )}
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`ws-nav-item${active === item.id ? " is-active" : ""}`}
                    onClick={() => select(item.id)}
                  >
                    <span className="ws-nav-item__icon">{item.icon}</span>
                    <span className="ws-nav-item__label">
                      {item.label ?? t(item.labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <Separator orientation="horizontal" style={{ height: 0.5 }} />
          <div className="ws-settings__nav-footer">
            <Button
              variant="ghost"
              style={{ justifyContent: "flex-start", width: "100%", gap: 8 }}
            >
              <Sparkles className="tiptap-button-icon" size={16} />
              <span className="tiptap-button-text">
                {t("settings.getUnlimitedAi")}
              </span>
            </Button>
          </div>
        </aside>

        {/* ── Content pane (full-screen pane on mobile) ────────────────── */}
        <section className={contentPaneClass}>
          <header className="ws-settings__header">
            {isMobile && (
              <button
                type="button"
                className="ws-settings__back"
                aria-label={t("actions.back", "Back")}
                onClick={() => setMobileShowContent(false)}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h1 className="ws-settings__title">{title ?? activeLabel}</h1>
            <div className="ws-settings__header-action">{headerAction}</div>
          </header>

          <div className="ws-settings__body">{children}</div>
        </section>

        {!isMobile && (
          <button
            type="button"
            className="ws-settings__close"
            aria-label={t("settings.closeAria")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </>
  );
}
