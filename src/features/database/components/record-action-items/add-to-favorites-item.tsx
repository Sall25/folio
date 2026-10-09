import { Star } from "lucide-react";
import { MenuRow } from "../menu-row";

export function AddToFavoritesItem({
  isFavorite,
  onToggle,
  label,
}: {
  isFavorite?: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <MenuRow
      Icon={Star}
      filled={isFavorite}
      label={
        label ?? (isFavorite ? "Remove from Favorites" : "Add to Favorites")
      }
      onClick={onToggle}
    />
  );
}
