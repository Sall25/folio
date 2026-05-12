import { Users, User, Bell, ChevronRight } from "lucide-react";

import type { PersonPropertyProps } from "./types";
import { DEFAULT_VALUE } from "./config";
import { LIMIT_LABELS, DEFAULT_LABELS, NOTIFICATIONS_LABELS } from "./config";

import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

import "./person-edit-display.scss";

export function PersonEditDisplay({
  value = DEFAULT_VALUE,
  onNavigate,
}: PersonPropertyProps) {
  return (
    <Card>
      <CardBody style={{ minWidth: 260 }}>
        <CardItemGroup>
          <PropertyRow
            icon={<Users style={{ width: 15, height: 15 }} />}
            label="Limit"
            currentValue={LIMIT_LABELS[value.limit]}
            onClick={() => onNavigate?.("limit")}
          />

          <PropertyRow
            icon={<User style={{ width: 15, height: 15 }} />}
            label="Default"
            currentValue={DEFAULT_LABELS[value.default]}
            onClick={() => onNavigate?.("default")}
          />

          <PropertyRow
            icon={<Bell style={{ width: 15, height: 15 }} />}
            label="Notifications"
            currentValue={NOTIFICATIONS_LABELS[value.notifications]}
            onClick={() => onNavigate?.("notifications")}
          />
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface PropertyRowProps {
  icon: React.ReactNode;
  label: string;
  currentValue: string;
  onClick: () => void;
}

function PropertyRow({ icon, label, currentValue, onClick }: PropertyRowProps) {
  return (
    <Button
      variant="ghost"
      style={{
        width: "100%",
        height: 32,
        justifyContent: "flex-start",
        gap: 8,
      }}
      onClick={onClick}
    >
      <span className="pp-row-icon">{icon}</span>
      <span className="pp-row-label">{label}</span>
      <Spacer orientation="horizontal" />
      <span className="pp-row-value">{currentValue}</span>
      <ChevronRight className="tiptap-button-icon-sub" />
    </Button>
  );
}
