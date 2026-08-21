import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useActivePageState } from "./context/active-page-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { StarIcon } from "src/components/tiptap-icons";
import type { Page } from "src/types";

const canFavoriteFn = (page: Page) =>
  page.category === "Private" || page.category === "Favorites";
const isFavoriteFn = (page: Page) => page.category === "Favorites";

export const FavoriteToggle = memo(function FavoriteToggle({
  page,
}: {
  page?: Page;
}) {
  const { t } = useTranslation();
  const { activePage, activePageId } = useActivePageState();
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const { canEditContent } = usePageCapabilities(page?.id ?? activePageId);

  if (!activePage || !canEditContent) return null;

  // Favoriting only applies to a user's own private pages. Shared and teamspace
  // pages live in their section by their access model, not the owner's stars.
  const canFavorite = canFavoriteFn(page ?? activePage);
  if (!canFavorite) return null;

  const isFavorite = isFavoriteFn(page ?? activePage);

  const toggle = () => {
    if (page) {
      mutateAsync({
        id: page.id,
        patch: {
          category: isFavorite ? "Private" : "Favorites",
          generalAccess: "private",
          generalAccessRole: "view",
        },
      });
    } else if (activePageId) {
      mutateAsync({
        id: activePageId,
        patch: {
          category: isFavorite ? "Private" : "Favorites",
          generalAccess: "private",
          generalAccessRole: "view",
        },
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="large"
      tooltip={t(isFavorite ? "page.unfavorite" : "page.favorite")}
      onClick={toggle}
      style={{
        width: "1.25rem",
        height: "1.25rem",
        minWidth: "1.25rem",
        minHeight: "1.25rem",
      }}
    >
      <StarIcon
        className="tiptap-button-icon"
        fill={isFavorite ? "currentColor" : "none"}
        style={{ color: isFavorite ? "var(--tt-brand-color-500)" : undefined }}
      />
    </Button>
  );
});
