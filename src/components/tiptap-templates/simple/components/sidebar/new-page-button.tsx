import { memo } from "react";
import { useTranslation } from "react-i18next";
import { SquarePen } from "lucide-react";
import { useCreatePageInSpace } from "src/api/use-create-page-in-space";
import { useActivePageActions } from "../../context/active-page-context";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayoutActions } from "../../context/editor-layout-context";
import { Button } from "src/components/tiptap-ui-primitive/button";

// The footer's compose button: a new page in the current space.
export const NewPageButton = memo(({ className }: { className?: string }) => {
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
        className="tiptap-button-icon"
        size={17}
        // style={{ color: "var(--tt-text-primary)" }}
      />
    </Button>
  );
});
NewPageButton.displayName = "NewPageButton";
