export type PersonLimit = "no-limit" | "single";

export type PersonDefault = "no-default" | "me";

export type PersonNotifications = "users-only" | "everyone";

export interface PersonPropertyValue {
  limit: PersonLimit;
  default: PersonDefault;
  notifications: PersonNotifications;
}

export type PersonPropertyPanel = "limit" | "default" | "notifications";

export interface PersonPropertyProps {
  value?: PersonPropertyValue;
  onNavigate?: (panel: PersonPropertyPanel) => void;
}
