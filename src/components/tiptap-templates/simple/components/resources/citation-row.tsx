import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { Citation } from "./types";
import { formatCitation, FORMAT_LABELS } from "./utils/format-citation";
import "./citation-row.scss";

interface CitationRowProps {
  citation: Citation;
  index: number;
}

export function CitationRow({ citation, index }: CitationRowProps) {
  const formatted = formatCitation(citation);

  function handleCopy() {
    navigator.clipboard.writeText(formatted);
  }

  return (
    <Card className="citation-row">
      <CardBody className="citation-row__body">
        <span className="citation-row__index" aria-label={`Citation ${index}`}>
          [{index}]
        </span>

        <p className="citation-row__text">{formatted}</p>

        <Separator orientation="vertical" className="citation-row__separator" />

        <span
          className={`citation-row__format citation-row__format--${citation.format}`}
        >
          {FORMAT_LABELS[citation.format]}
        </span>

        <Button
          data-style="ghost"
          aria-label="Copy citation"
          tooltip="Copy"
          className="citation-row__copy"
          onClick={handleCopy}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="4.5"
              y="4.5"
              width="7"
              height="8"
              rx="1.2"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M2.5 9.5V2.5h7"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </CardBody>
    </Card>
  );
}
