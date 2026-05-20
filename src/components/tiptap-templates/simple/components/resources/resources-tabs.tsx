import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { ResourceType, ResourceStats } from "./types";
import "./resources-tabs.scss";
import { Book, File, Paperclip, Quote, type LucideIcon } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface Tab {
  id: ResourceType;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  {
    id: "books",
    label: "Books",
    icon: Book,
  },
  {
    id: "papers",
    label: "Papers",
    icon: File,
  },
  {
    id: "links",
    label: "Links",
    icon: Paperclip,
  },
  {
    id: "citations",
    label: "Citations",
    icon: Quote,
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
      {TABS.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant="ghost"
          role="tab"
          data-active-state={active === id ? "on" : "off"}
          aria-selected={active === id}
          style={{ minHeight: 24, height: 24, background: "transparent" }}
          onClick={() => onChange(id)}
        >
          <Icon className="tiptap-button-icon" aria-hidden="true" />

          <span className="tiptap-button-text">{label}</span>
          <span
            className="resource-tabs__count"
            aria-label={`${stats[id]} items`}
          >
            {stats[id]}
          </span>
        </Button>
      ))}
      <Separator className="resource-tabs__separator" />
    </div>
  );
}
