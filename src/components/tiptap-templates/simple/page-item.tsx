import { useEffect, useRef, useState } from "react";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { PageItemIcon } from "./page-item-icon";
import { PageItemOptions } from "./page-item-options";
import { ChevronRight, Plus } from "lucide-react";
import type { Page } from "./types";

import "./page-item.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface PageItemProps {
  page: Page;
  activePage: Page | null;
  depth?: number;
  onSelectAsync: (page: Page) => Promise<void>;
  onDeleteAsync: (id: string) => Promise<void>;
  onAddPageAsync: (title: string, parentId: string) => Promise<void>;
  onRenameAsync: (id: string, title: string) => Promise<void>;
}

export function PageItem({
  page,
  activePage,
  depth = 0,
  onSelectAsync,
  onDeleteAsync,
  onAddPageAsync,
  onRenameAsync,
}: PageItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChildren = page.children && page.children.length > 0;
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDraft(page.title));

    return () => cancelAnimationFrame(raf);
  }, [page.title]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.title) {
      await onRenameAsync(page.id, trimmed);
    } else {
      setDraft(page.title);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraft(page.title);
      setEditing(false);
    }
  };

  return (
    <div className="page-item-tree">
      <CardItemGroup
        orientation="horizontal"
        className={`page-item ${activePage?.id === page.id ? "active" : ""}`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        onClick={async () => {
          if (!editing) {
            await onSelectAsync(page);
          }
          console.log("clicked");
        }}
        onMouseOver={() => setShouldShow(true)}
        onMouseLeave={() => setShouldShow(false)}
      >
        {/* Expand toggle */}
        <Button
          variant="ghost"
          className={`page-expand-btn ${hasChildren ? "visible" : ""}`}
          onClick={(e) => {
            console.log("expand button clicked");
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
          style={{
            zIndex: 10,
            opacity: shouldShow && hasChildren ? 1 : 0,
            // pointerEvents: shouldShow && hasChildren ? "auto" : "none",
            transition: "opacity 150ms ease",
            position: "absolute",
          }}
        >
          <ChevronRight
            className="tiptap-button-icon"
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 200ms ease",
            }}
          />
        </Button>

        <PageItemIcon
          cover={page.cover}
          styles={{
            opacity: shouldShow && hasChildren ? 0 : 1,
            transition: "opacity 150ms ease",
          }}
        />

        {editing ? (
          <input
            ref={inputRef}
            className="page-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="page-title">{page.title || "Untitled"}</span>
        )}

        <PageItemOptions
          page={page}
          onDeleteAsync={onDeleteAsync}
          onAddPageAsync={onAddPageAsync}
          onRenameAsync={async () => setEditing(true)}
        />
        {shouldShow && (
          <Button
            style={{ minWidth: 6, width: 6, minHeight: 6, height: 6 }}
            variant="ghost"
            tooltip="New page"
            onClick={async () => await onAddPageAsync("Untitled", page.id)}
          >
            <Plus size={6} className="tiptap-button-icon" />
          </Button>
        )}
      </CardItemGroup>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="page-item-children">
          {page.children.map((child) => (
            <PageItem
              key={child.id}
              page={child}
              activePage={activePage}
              depth={depth + 1}
              onSelectAsync={onSelectAsync}
              onDeleteAsync={onDeleteAsync}
              onAddPageAsync={onAddPageAsync}
              onRenameAsync={onRenameAsync}
            />
          ))}
        </div>
      )}
    </div>
  );
}
