import { CitationRow } from "./citation-row";
import type { Citation } from "./types";
import { MOCK_CITATIONS } from "./data/mock-citations";
import "./citation-list.scss";

interface CitationListProps {
  citations?: Citation[];
}

export function CitationList({
  citations = MOCK_CITATIONS,
}: CitationListProps) {
  return (
    <div className="citation-list">
      {citations.map((citation, i) => (
        <CitationRow key={citation.id} citation={citation} index={i + 1} />
      ))}
    </div>
  );
}
