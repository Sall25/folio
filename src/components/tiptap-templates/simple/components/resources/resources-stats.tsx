import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import type { ResourceStats as ResourceStatsType } from "./types";
import "./resources-stats.scss";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card className="stat-card">
      <CardBody className="stat-card__body">
        <span className="stat-card__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
      </CardBody>
    </Card>
  );
}

interface ResourceStatsProps {
  stats: ResourceStatsType;
}

export function ResourceStats({ stats }: ResourceStatsProps) {
  return (
    <div className="resource-stats" role="list" aria-label="Resource counts">
      <div role="listitem">
        <StatCard
          label="Books"
          value={stats.books}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="2"
                y="2"
                width="9"
                height="12"
                rx="1.2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M5 5h4M5 7.5h4M5 10h2.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M11 4v10"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M11 14l2-2-2-2"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      </div>
      <div role="listitem">
        <StatCard
          label="Papers"
          value={stats.papers}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="2"
                y="1"
                width="10"
                height="13"
                rx="1.2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M5 5h5M5 7.5h5M5 10h3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </div>
      <div role="listitem">
        <StatCard
          label="Links"
          value={stats.links}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7.5 3.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </div>
      <div role="listitem">
        <StatCard
          label="Citations"
          value={stats.citations}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 5.5C3 4.4 3.9 3.5 5 3.5h1.5v3H5c-.6 0-1 .4-1 1v.5H6.5V11H3V5.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M9 5.5C9 4.4 9.9 3.5 11 3.5h1.5v3H11c-.6 0-1 .4-1 1v.5H12.5V11H9V5.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      </div>
    </div>
  );
}
