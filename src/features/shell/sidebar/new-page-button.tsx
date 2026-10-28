import { memo } from "react";
import { useTranslation } from "react-i18next";
import { SquarePen } from "lucide-react";
import { useCreatePageInSpace } from "src/api/use-create-page-in-space";
import { useActivePageActions } from "../../pages/context/active-page-context";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayoutActions } from "../context/editor-layout-context";
import { Button } from "src/components/tiptap-ui-primitive/button";

// New page in the current space: the square-and-pen at the end of the
// sidebar's top row.
export const NewPageButton = memo(
  ({ className, label = false }: { className?: string; label?: boolean }) => {
    const { t } = useTranslation();
    const { createPageInSpace, isPending } = useCreatePageInSpace();
    const { setActivePageId } = useActivePageActions();
    const isMobile = useIsMobile();
    const { onCollapsedChange } = useEditorLayoutActions();

    return (
      <Button
        type="button"
        size="large"
        className={className}
        aria-label={t("page.newPage")}
        tooltip={t("page.newPage")}
        disabled={isPending}
        onClick={() => {
          createPageInSpace(t("page.newPage"))
            .then((page) => {
              if (!page) return;
              setActivePageId(page.id);
              if (isMobile) onCollapsedChange(true);
            })
            .catch(() => {});
        }}
        variant="ghost"
      >
        <SquarePen
          size={14}
          stroke="var(--accent)"
          strokeWidth={1.6}
          className="tiptap-button-icon"
        />

        {label && (
          <span className="tiptap-button-text">{t("page.newPage")}</span>
        )}
      </Button>
    );
  },
);
NewPageButton.displayName = "NewPageButton";
