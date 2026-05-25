import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Lock } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { BreadcrumbItem } from "./breadcrumb-node";
import "./page-breadcrumb.scss";

export function BreadcrumbNodeView({ node }: NodeViewProps) {
  const items: BreadcrumbItem[] = node.attrs.items ?? [];
  const { setActivePageId } = useActivePage();

  return (
    <NodeViewWrapper contentEditable={false}>
      <div className="page-breadcrumb">
        {items.map((item, i) => (
          <span key={i} className="page-breadcrumb__item">
            {i > 0 && <span className="page-breadcrumb__separator">/</span>}
            <Button
              variant="ghost"
              className={`page-breadcrumb__label ${
                i === items.length - 1 ? "page-breadcrumb__label--active" : ""
              }`}
              onClick={() => {
                if (item.pageId != null) setActivePageId(item.pageId);
              }}
            >
              {item.iconName && (
                <span className="tiptap-button-icon" style={{ marginRight: 5 }}>
                  <DynamicIcon
                    name={item.iconName}
                    size={14}
                    strokeWidth={1.8}
                  />
                </span>
              )}
              {item.label}
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
    </NodeViewWrapper>
  );
}
