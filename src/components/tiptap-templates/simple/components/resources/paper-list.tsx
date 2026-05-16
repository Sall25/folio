import { PaperRow } from "./paper-row";
import type { Paper } from "./types";
import { MOCK_PAPERS } from "./data/mock-papers";
import "./paper-list.scss";

interface PaperListProps {
  papers?: Paper[];
}

export function PaperList({ papers = MOCK_PAPERS }: PaperListProps) {
  return (
    <div className="paper-list">
      {papers.map((paper) => (
        <PaperRow key={paper.id} paper={paper} />
      ))}
    </div>
  );
}
