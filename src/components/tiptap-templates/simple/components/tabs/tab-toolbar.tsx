import { forwardRef, type ReactNode } from "react";
import { cn } from "src/lib/tiptap-utils";
import {
  Tabs,
  type TabsProps,
} from "src/components/tiptap-templates/simple/components/tabs/tabs";
import styles from "./tab-toolbar.module.scss";

export interface TabToolbarProps extends TabsProps {
  /** Pinned left of the tabs — e.g. a sidebar-collapse button. */
  leading?: ReactNode;
  /**
   * Pinned right of the tabs — e.g. split-view or window actions. These are
   * real buttons, so wrap them in your <Toolbar>/<ToolbarGroup> here if you
   * want toolbar keyboard semantics for them; the tablist keeps its own.
   */
  trailing?: ReactNode;
}

/**
 * A bar that sits above the breadcrumb and hosts the tab strip.
 *
 * Deliberately not a `role="toolbar"`: the tab strip is a `tablist`, and
 * wrapping it in your Toolbar primitive would let useToolbarNavigation pull
 * the close buttons and the + into the same arrow sequence as the tabs. This
 * matches the toolbar's look and house conventions without that conflict.
 */
export const TabToolbar = forwardRef<HTMLDivElement, TabToolbarProps>(
  ({ leading, trailing, className, ...tabsProps }, ref) => (
    <div ref={ref} className={cn(styles.bar, className)} data-variant="fixed">
      {leading && <div className={styles.leading}>{leading}</div>}
      <Tabs {...tabsProps} className={styles.tabs} />
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </div>
  ),
);
TabToolbar.displayName = "TabToolbar";

export default TabToolbar;
