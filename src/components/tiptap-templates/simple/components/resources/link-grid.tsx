import { LinkCard } from "./link-card";
import type { ResourceLink } from "./types";
import { MOCK_LINKS } from "./data/mock-links";
import "./link-grid.scss";

interface LinkGridProps {
  links?: ResourceLink[];
}

export function LinkGrid({ links = MOCK_LINKS }: LinkGridProps) {
  return (
    <div className="link-grid">
      {links.map((link) => (
        <LinkCard key={link.id} link={link} />
      ))}
    </div>
  );
}
