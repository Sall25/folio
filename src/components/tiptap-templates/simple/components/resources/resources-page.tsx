import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { ResourceStats } from "./resources-stats";
import { ResourceTabs } from "./resources-tabs";
import { BookGrid } from "./book-grid";
import { PaperList } from "./paper-list";
import { LinkGrid } from "./link-grid";
import { CitationList } from "./citation-list";
import { MOCK_BOOKS } from "./data/mock-books";
import { MOCK_PAPERS } from "./data/mock-papers";
import { MOCK_LINKS } from "./data/mock-links";
import { MOCK_CITATIONS } from "./data/mock-citations";
import type { ResourceType } from "./types";
import "./resources-page.scss";

const MOCK_STATS = {
  books: MOCK_BOOKS.length,
  papers: MOCK_PAPERS.length,
  links: MOCK_LINKS.length,
  citations: MOCK_CITATIONS.length,
};

const SECTION_LABELS: Record<ResourceType, string> = {
  books: "Books",
  papers: "Papers",
  links: "Links",
  citations: "Citations",
};

export function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<ResourceType>("books");

  return (
    <div className="resources-page">
      <div className="resources-page__header">
        <div className="resources-page__heading">
          <h1 className="resources-page__title">Resources</h1>
          <p className="resources-page__sub">Your personal academic library</p>
        </div>

        <Spacer />

        <Button
          data-style="ghost"
          aria-label="Add resource"
          className="resources-page__add-btn"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 2v10M2 7h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>Add {SECTION_LABELS[activeTab].toLowerCase()}</span>
        </Button>
      </div>

      <Separator className="resources-page__separator" />

      <ResourceStats stats={MOCK_STATS} />

      <ResourceTabs
        active={activeTab}
        stats={MOCK_STATS}
        onChange={setActiveTab}
      />

      <div
        role="tabpanel"
        id={`resource-panel-${activeTab}`}
        aria-label={SECTION_LABELS[activeTab]}
        className="resources-page__panel"
      >
        {activeTab === "books" && <BookGrid />}
        {activeTab === "papers" && <PaperList />}
        {activeTab === "links" && <LinkGrid />}
        {activeTab === "citations" && <CitationList />}
      </div>
    </div>
  );
}
