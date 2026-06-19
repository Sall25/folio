import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type {
  ConfigOf,
  DatabaseProperty,
  PersonLimit,
  PersonDefault,
  PersonNotifications,
} from "src/types";
//import "./person-edit-display.scss";

type PersonConfig = ConfigOf<"person">;

const LIMIT_LABEL: Record<PersonLimit, string> = {
  "no-limit": "No limit",
  single: "1 person",
};

const DEFAULT_LABEL: Record<PersonDefault, string> = {
  "no-default": "No default",
  me: "Me",
};

const NOTIF_LABEL: Record<PersonNotifications, string> = {
  "users-only": "Users only",
  everyone: "Everyone",
};

function RowValue({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="tiptap-button-text"
      style={{ color: "var(--tt-gray-light-500)" }}
    >
      {children}
    </span>
  );
}

function OptionList<T extends string>({
  options,
  current,
  onPick,
}: {
  options: Record<T, string>;
  current: T;
  onPick: (value: T) => void;
}) {
  return (
    <Card style={{ padding: "5px 10px", minWidth: 170 }}>
      <CardItemGroup>
        {(Object.keys(options) as T[]).map((key) => (
          <Button
            key={key}
            variant="ghost"
            style={{
              justifyContent: "flex-start",
              width: "100%",
              fontWeight: key === current ? 600 : 400,
            }}
            onClick={() => onPick(key)}
          >
            <span className="tiptap-button-text">{options[key]}</span>
          </Button>
        ))}
      </CardItemGroup>
    </Card>
  );
}

export function PersonEditDisplay({
  prop,
  onChange,
}: {
  prop: DatabaseProperty;
  onChange: (config: PersonConfig) => void;
}) {
  const config = prop.config as PersonConfig;
  const limit = config.limit ?? "no-limit";
  const def = config.default ?? "no-default";
  const notifications = config.notifications ?? "users-only";

  const [limitOpen, setLimitOpen] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const emit = (patch: Partial<PersonConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <Card
      style={{ padding: "5px 10px", boxShadow: "var(--tt-shadow-elevated-sm)" }}
    >
      <CardBody>
        <CardItemGroup>
          {/* Limit */}
          <Popover open={limitOpen} onOpenChange={setLimitOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ width: "100%", justifyContent: "flex-start" }}
              >
                <span className="tiptap-button-text">Limit</span>
                <Spacer orientation="horizontal" />
                <RowValue>{LIMIT_LABEL[limit]}</RowValue>
                <ChevronRight className="tiptap-button-icon-sub" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start">
              <OptionList
                options={LIMIT_LABEL}
                current={limit}
                onPick={(v) => {
                  emit({ limit: v });
                  setLimitOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          {/* Default */}
          <Popover open={defaultOpen} onOpenChange={setDefaultOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ width: "100%", justifyContent: "flex-start" }}
              >
                <span className="tiptap-button-text">Default</span>
                <Spacer orientation="horizontal" />
                <RowValue>{DEFAULT_LABEL[def]}</RowValue>
                <ChevronRight className="tiptap-button-icon-sub" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start">
              <OptionList
                options={DEFAULT_LABEL}
                current={def}
                onPick={(v) => {
                  emit({ default: v });
                  setDefaultOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          {/* Notifications */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ width: "100%", justifyContent: "flex-start" }}
              >
                <span className="tiptap-button-text">Notifications</span>
                <Spacer orientation="horizontal" />
                <RowValue>{NOTIF_LABEL[notifications]}</RowValue>
                <ChevronRight className="tiptap-button-icon-sub" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start">
              <OptionList
                options={NOTIF_LABEL}
                current={notifications}
                onPick={(v) => {
                  emit({ notifications: v });
                  setNotifOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
