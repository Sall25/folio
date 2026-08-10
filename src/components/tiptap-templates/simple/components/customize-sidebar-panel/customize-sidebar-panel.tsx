import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PageCategory } from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./customize-sidebar-panel.scss";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

const CATEGORY_LABEL: Record<PageCategory, string> = {
  Recent: "section.recent",
  Favorites: "section.favorites",
  Shared: "section.shared",
  Private: "section.private",
  Teamspaces: "section.teamspaces",
  Template: "section.template",
};

export function CustomizeSidebarPanel({
  order,
  hidden,
  onToggle,
  onDone,
}: {
  order: PageCategory[];
  hidden: Set<string>;
  onToggle: (category: PageCategory) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  // Show all sections (in their current order), including hidden ones —
  // the panel is the only place a hidden section can be turned back on.
  const sections = order.filter((c) => c !== "Template");

  return (
    <div className="customize-sidebar" contentEditable={false}>
      <div className="customize-sidebar__list">
        {sections.map((category) => {
          const isHidden = hidden.has(category);
          return (
            <Button
              key={category}
              type="button"
              className="customize-sidebar__row"
              onClick={() => onToggle(category)}
            >
              <span
                className={`customize-sidebar__label${isHidden ? " is-hidden" : ""}`}
              >
                {t(CATEGORY_LABEL[category]) ?? category}
              </span>
              {isHidden ? (
                <EyeOff size={16} className="customize-sidebar__eye is-off" />
              ) : (
                <Eye size={16} className="customize-sidebar__eye" />
              )}
            </Button>
          );
        })}
      </div>

      <Spacer orientation="vertical" />

      <Button
        variant="primary"
        className="customize-sidebar__done"
        onClick={onDone}
      >
        {t("done")}
      </Button>
    </div>
  );
}
