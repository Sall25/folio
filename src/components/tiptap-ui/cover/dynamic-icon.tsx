import {
  CaseSensitive, // match_case (title)
  AlignLeft, // notes (text)
  Hash, // tag (number)
  SquareCheck, // check_box (checkbox)
  CircleChevronDown, // expand_circle_down (select)
  List, // list (multi_select)
  LoaderCircle, // arrow_upload_progress (status)
  Calendar, // calendar_today (date)
  User, // person
  FunctionSquare, // functions (formula)
  ArrowLeftRight, // sync_alt (relation)
  ArrowUpDown, // swap_vert (rollup)
  Link, // link (url)
  Phone, // call (phone)
  Mail, // mail (email)
  Clock, // schedule (created_time / edited_time)
  UserPlus, // person_add (created_by)
  Pencil, // edit (edited_by)
  FileText, // fallback
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { memo } from "react";

// Keys = the exact strings in PROPERTY_TYPE_ICONS (the old Material names).
const ICON_MAP: Record<string, LucideIcon> = {
  match_case: CaseSensitive,
  notes: AlignLeft,
  tag: Hash,
  check_box: SquareCheck,
  expand_circle_down: CircleChevronDown,
  list: List,
  arrow_upload_progress: LoaderCircle,
  calendar_today: Calendar,
  person: User,
  functions: FunctionSquare,
  sync_alt: ArrowLeftRight,
  swap_vert: ArrowUpDown,
  link: Link,
  call: Phone,
  mail: Mail,
  schedule: Clock,
  person_add: UserPlus,
  edit: Pencil,
};

function DynamicIconImpl({
  name,
  size = 16,
  className,
  style,
}: {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  weight?: number; // ignored (was a Material font axis)
  filled?: boolean; // ignored
}) {
  const Icon = (name && ICON_MAP[name]) || FileText;
  return <Icon size={size} className={className} style={style} />;
}

export const DynamicIcon = memo(DynamicIconImpl);
