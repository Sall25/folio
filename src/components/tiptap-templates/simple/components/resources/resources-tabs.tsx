import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { ResourceType, ResourceStats } from "./types";
import "./resources-tabs.scss";

interface Tab {
  id: ResourceType;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: "books",
    label: "Books",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect
          x="1.5"
          y="1.5"
          width="8"
          height="11"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M4 4h4M4 6.5h4M4 9h2.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M9.5 3.5v8"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M9.5 11.5l2-2-2-2"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "papers",
    label: "Papers",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect
          x="1.5"
          y="1"
          width="9"
          height="12"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M4 4.5h5M4 7h5M4 9.5h3"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "links",
    label: "Links",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M5.5 8.5a3 3 0 004.3 0l1.7-1.7a3 3 0 00-4.3-4.3L6.3 3.4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M8.5 5.5a3 3 0 00-4.3 0L2.5 7.2a3 3 0 004.3 4.3l.9-.9"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "citations",
    label: "Citations",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M2.5 5C2.5 4.2 3.2 3.5 4 3.5h1.5v2.8H4c-.5 0-.8.3-.8.8V7.5H5.5V10H2.5V5z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M8 5C8 4.2 8.7 3.5 9.5 3.5H11v2.8H9.5c-.5 0-.8.3-.8.8V7.5H11V10H8V5z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

interface ResourceTabsProps {
  active: ResourceType;
  stats: ResourceStats;
  onChange: (tab: ResourceType) => void;
}

export function ResourceTabs({ active, stats, onChange }: ResourceTabsProps) {
  return (
    <div
      className="resource-tabs"
      role="tablist"
      aria-label="Resource sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`resource-panel-${tab.id}`}
          className={`resource-tabs__tab ${active === tab.id ? "resource-tabs__tab--active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="resource-tabs__icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="resource-tabs__label">{tab.label}</span>
          <span
            className="resource-tabs__count"
            aria-label={`${stats[tab.id]} items`}
          >
            {stats[tab.id]}
          </span>
        </button>
      ))}
      <Separator className="resource-tabs__separator" />
    </div>
  );
}
