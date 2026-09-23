import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearch } from "../../context/search-context";
import "./quick-open-trigger.scss";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

// Quick open (page search) in the toolbar's center. No box: icon, label, a
// small dot, and the shortcut — all in the toolbar's muted text color, so it
// reads as part of the toolbar. `compact` renders just the icon (tablet /
// mobile).
export function QuickOpenTrigger({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { onOpenChange } = useSearch();
  const label = t("quickOpen.placeholder", "Search pages…");

  if (compact) {
    return (
      <button
        type="button"
        className="quick-open quick-open--compact"
        aria-label={label}
        title={label}
        onClick={() => onOpenChange?.(true)}
      >
        <Search size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="quick-open"
      onClick={() => onOpenChange?.(true)}
    >
      <Search size={14} className="quick-open__icon" />
      <span className="quick-open__label">{label}</span>
      <span className="quick-open__dot" aria-hidden="true" />
      <kbd className="quick-open__kbd">{isMac ? "⌘ P" : "Ctrl P"}</kbd>
    </button>
  );
}
