import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { Paper } from "./types";

import "./paper-row.scss";

interface PaperRowProps {
  paper: Paper;
}

export function PaperRow({ paper }: PaperRowProps) {
  const authors =
    paper.authors.length > 2
      ? `${paper.authors[0]} et al.`
      : paper.authors.join(" & ");

  return (
    <Card className="paper-row">
      <CardBody className="paper-row__body">
        <div className="paper-row__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="2"
              y="1"
              width="10"
              height="13"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="5"
              y1="5"
              x2="9"
              y2="5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <line
              x1="5"
              y1="7.5"
              x2="10"
              y2="7.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <line
              x1="5"
              y1="10"
              x2="8"
              y2="10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="paper-row__content">
          <p className="paper-row__title">{paper.title}</p>
          <p className="paper-row__meta">
            <span>{authors}</span>
            <span className="paper-row__dot" aria-hidden="true">
              ·
            </span>
            <span>{paper.year}</span>
            <span className="paper-row__dot" aria-hidden="true">
              ·
            </span>
            <span>{paper.source}</span>
            {paper.doi && (
              <>
                <span className="paper-row__dot" aria-hidden="true">
                  ·
                </span>
                <span className="paper-row__doi">{paper.doi}</span>
              </>
            )}
          </p>
        </div>

        <div className="paper-row__tags">
          {paper.tags.map((tag) => (
            <span key={tag} className="paper-row__tag">
              {tag}
            </span>
          ))}
          {paper.course && (
            <span className="paper-row__tag paper-row__tag--course">
              {paper.course}
            </span>
          )}
        </div>

        <Separator orientation="vertical" className="paper-row__separator" />

        <Button
          data-style="ghost"
          aria-label="Open paper"
          className="paper-row__action"
          disabled={!paper.url && !paper.doi}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 11L11 3M11 3H6.5M11 3V7.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </CardBody>
    </Card>
  );
}
