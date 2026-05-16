import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { ResourceLink, LinkCategory } from "./types";
import "./link-card.scss";

interface LinkCardProps {
  link: ResourceLink;
}

const CATEGORY_LABELS: Record<LinkCategory, string> = {
  article: "Article",
  video: "Video",
  tool: "Tool",
  course: "Course",
  docs: "Docs",
  other: "Other",
};

function getFavicon(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function LinkCard({ link }: LinkCardProps) {
  const favicon = getFavicon(link.url);
  const hostname = getHostname(link.url);

  return (
    <Card className="link-card">
      <CardBody className="link-card__body">
        <div className="link-card__favicon" aria-hidden="true">
          {favicon ? (
            <img src={favicon} alt="" width={16} height={16} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle
                cx="7"
                cy="7"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M7 1.5C7 1.5 5 4 5 7s2 5.5 2 5.5M7 1.5C7 1.5 9 4 9 7s-2 5.5-2 5.5M1.5 7h11"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        <div className="link-card__content">
          <p className="link-card__title" title={link.title}>
            {link.title}
          </p>
          <p className="link-card__url">{hostname}</p>
          {link.description && (
            <p className="link-card__description">{link.description}</p>
          )}
        </div>

        <div className="link-card__footer">
          <span
            className={`link-card__category link-card__category--${link.category}`}
          >
            {CATEGORY_LABELS[link.category]}
          </span>

          <div className="link-card__tags">
            {link.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="link-card__tag">
                {tag}
              </span>
            ))}
          </div>

          <Button
            data-style="ghost"
            aria-label="Open link"
            className="link-card__action"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 10.5L10.5 2.5M10.5 2.5H6M10.5 2.5V7"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
