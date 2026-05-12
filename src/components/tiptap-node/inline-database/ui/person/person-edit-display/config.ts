import type {
  PersonLimit,
  PersonDefault,
  PersonNotifications,
  PersonPropertyValue,
} from "./types";

export const DEFAULT_VALUE: PersonPropertyValue = {
  limit: "no-limit",
  default: "no-default",
  notifications: "users-only",
};

export const LIMIT_OPTIONS: {
  value: PersonLimit;
  label: string;
  description: string;
}[] = [
  {
    value: "no-limit",
    label: "No limit",
    description: "Allow any number of people",
  },
  {
    value: "single",
    label: "Single person",
    description: "Limit to one person only",
  },
];

export const DEFAULT_OPTIONS: {
  value: PersonDefault;
  label: string;
  description: string;
}[] = [
  {
    value: "no-default",
    label: "No default",
    description: "Leave empty by default",
  },
  { value: "me", label: "Me", description: "Pre-fill with the current user" },
];

export const NOTIFICATIONS_OPTIONS: {
  value: PersonNotifications;
  label: string;
  description: string;
}[] = [
  {
    value: "users-only",
    label: "Users only",
    description: "Notify only tagged users",
  },
  {
    value: "everyone",
    label: "Everyone",
    description: "Notify all workspace members",
  },
];

export const LIMIT_LABELS: Record<PersonLimit, string> = {
  "no-limit": "No limit",
  single: "Single person",
};

export const DEFAULT_LABELS: Record<PersonDefault, string> = {
  "no-default": "No default",
  me: "Me",
};

export const NOTIFICATIONS_LABELS: Record<PersonNotifications, string> = {
  "users-only": "Users only",
  everyone: "Everyone",
};
