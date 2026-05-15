import { Lock } from "lucide-react";
import type { PageBreadcrumbProps } from "./types";

import "./page-breadcrumb.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
  return (
    <div className="page-breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="page-breadcrumb__item">
          {i > 0 && <span className="page-breadcrumb__separator">/</span>}
          <Button
            variant="ghost"
            className={`page-breadcrumb__label ${i === items.length - 1 ? "page-breadcrumb__label--active" : ""}`}
            onClick={item.onClick}
          >
            {item.icon && (
              <span className="tiptap-button-icon">{item.icon}</span>
            )}
            {item.label}{" "}
            {i === items.length - 1 && item.locked && (
              <span
                className="tiptap-button-text"
                style={{ display: "flex", gap: 5 }}
              >
                <Lock size={14} className="page-breadcrumb__lock" />
                <span>locked</span>
              </span>
            )}
          </Button>
        </span>
      ))}
    </div>
  );
}
