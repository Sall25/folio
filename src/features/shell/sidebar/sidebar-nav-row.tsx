import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import "./sidebar-nav-row.scss";

interface SidebarNavRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: ReactNode;
  active?: boolean;
  /** Right side: a count, a shortcut hint… */
  trailing?: ReactNode;
}

// One sidebar row: [icon] label [trailing]. Search, Home, Inbox, Chats,
// Library, Templates and Trash all use it, so they share one height, one
// font and one icon column with the page rows below.
// forwardRef so it can be a Radix trigger (asChild).
export const SidebarNavRow = forwardRef<HTMLButtonElement, SidebarNavRowProps>(
  (
    {
      icon,
      label,
      active = false,
      trailing,
      className,
      type = "button",
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={["sb-nav-row", active && "is-active", className]
        .filter(Boolean)
        .join(" ")}
      aria-current={active ? "page" : undefined}
      {...rest}
    >
      <span className="sb-nav-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="sb-nav-row__label">{label}</span>
      {trailing != null && trailing !== false && (
        <span className="sb-nav-row__trailing">{trailing}</span>
      )}
    </button>
  ),
);
SidebarNavRow.displayName = "SidebarNavRow";

/** Red count pill for a row (unread notifications, chat messages). */
export function SidebarNavCount({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="sb-nav-row__count">{value > 99 ? "99+" : value}</span>
  );
}
