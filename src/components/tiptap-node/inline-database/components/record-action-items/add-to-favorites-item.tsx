import { Star } from "lucide-react";
import { MenuRow } from "../menu-row";

// Add to Favorites — toggles; the label/icon reflect current state.
export function AddToFavoritesItem({
  isFavorite,
  onToggle,
}: {
  isFavorite?: boolean;
  onToggle: () => void;
}) {
  return (
    <MenuRow
      Icon={Star}
      filled={isFavorite}
      label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      onClick={onToggle}
    />
  );
}
