import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import type { ResourceStats as ResourceStatsType } from "./types";
import "./resources-stats.scss";
import { Book, File, Paperclip, Quote, type LucideIcon } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card className="stat-card" style={{ boxShadow: "none", minWidth: 180 }}>
      <CardBody className="stat-card__body">
        <Icon className="stat-card__icon" />
        {/* <span className="stat-card__icon" aria-hidden="true">
          {icon}
        </span> */}
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
    <CardItemGroup
      orientation="horizontal"
      style={{ width: "100%" }}
      // className="resource-stats"
      role="list"
      aria-label="Resource counts"
    >
      <StatCard label="Books" value={stats.books} icon={Book} />
      <Spacer orientation="horizontal" />
      <StatCard label="Papers" value={stats.papers} icon={File} />
      <Spacer orientation="horizontal" />
      <StatCard label="Links" value={stats.links} icon={Paperclip} />
      <Spacer orientation="horizontal" />
      <StatCard label="Citations" value={stats.citations} icon={Quote} />
    </CardItemGroup>
  );
}
