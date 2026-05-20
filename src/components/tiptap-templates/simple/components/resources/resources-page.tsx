import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { ResourceStats } from "./resources-stats";
import { ResourceTabs } from "./resources-tabs";
import { BookGrid } from "./book-grid";
import { PaperList } from "./paper-list";
import { LinkGrid } from "./link-grid";
import { CitationList } from "./citation-list";
import { useResources } from "./hooks/use-resources";
import type { ResourceType } from "./types";
import "./resources-page.scss";
import { useEditorLayout } from "../../context/editor-layout-context";

const SECTION_LABELS: Record<ResourceType, string> = {
  books: "Books",
  papers: "Papers",
  links: "Links",
  citations: "Citations",
};

export function ResourcesPage() {
  const {
    books,
    papers,
    links,
    citations,
    stats,
    isLoading,
    activeType,
    setActiveType,
  } = useResources();
  const { sidebarWidth } = useEditorLayout();

  return (
    <div className="resources-page" style={{ marginLeft: sidebarWidth + 100 }}>
      <div className="resources-page__header">
        <div className="resources-page__heading">
          <h1 className="resources-page__title">Resources</h1>
          <p className="resources-page__sub">Your personal academic library</p>
        </div>

        <Spacer />

        <Button
          data-style="ghost"
          aria-label={`Add ${SECTION_LABELS[activeType].toLowerCase()}`}
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
          <span>Add {SECTION_LABELS[activeType].toLowerCase()}</span>
        </Button>
      </div>

      <ResourceStats stats={stats} />

      <ResourceTabs
        active={activeType}
        stats={stats}
        onChange={setActiveType}
      />

      <div
        role="tabpanel"
        id={`resource-panel-${activeType}`}
        aria-label={SECTION_LABELS[activeType]}
        className="resources-page__panel"
      >
        {isLoading ? (
          <div
            className="resources-page__loading"
            aria-label="Loading resources"
          >
            <span className="resources-page__loading-dot" />
            <span className="resources-page__loading-dot" />
            <span className="resources-page__loading-dot" />
          </div>
        ) : (
          <>
            {activeType === "books" && <BookGrid books={books} />}
            {activeType === "papers" && <PaperList papers={papers} />}
            {activeType === "links" && <LinkGrid links={links} />}
            {activeType === "citations" && (
              <CitationList citations={citations} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
