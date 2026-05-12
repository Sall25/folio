import {
  Type,
  User,
  Calendar,
  Hash,
  CheckSquare,
  UserCheck,
  Clock,
  Edit3,
} from "lucide-react";
import type { PropertyType } from "./types";
import type { LucideIcon } from "lucide-react";

export const PROPERTY_TYPE_ICONS: Record<PropertyType, LucideIcon> = {
  text: Type,
  person: User,
  date: Calendar,
  number: Hash,
  checkbox: CheckSquare,
  created_by: UserCheck,
  created_time: Clock,
  edited_by: Edit3,
  edited_time: Clock,
};
