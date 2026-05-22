import { useEffect, useRef, useState } from "react";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { PageItemIcon } from "./page-item-icon";
import { PageItemOptions } from "./page-item-options";
import { ChevronRight, Plus } from "lucide-react";
import type { Page } from "./types";

import "./page-item.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useActivePage } from "./use-active-page";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

interface PageItemProps {
  page: Page;
  depth?: number;
  disableActive?: boolean;
}

export function PageItem({
  page,
  depth = 0,
  disableActive = false,
}: PageItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasChildren = page.children && page.children.length > 0;
  const [shouldShow, setShouldShow] = useState(false);

  const { addPageAndActivateAsync, updatePageAsync, activePageId } =
    useActivePage();
  const isActive = activePageId === page.id && !disableActive;
  const title = page.title || "New Page";
  const cover = page.cover;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDraft(page.title));
    return () => cancelAnimationFrame(raf);
  }, [page.title]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.title) {
      await updatePageAsync({ ...page, title: trimmed });
    } else {
      setDraft(page.title);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraft(page.title);
      setEditing(false);
    }
  };

  const { setActivePageId } = useActivePage();
  const onSelect = (pageId: number) => {
    console.time("navigation");
    setActivePageId(pageId);
    console.timeEnd("navigation");
  };

  return (
    <div className="page-item-tree">
      <CardItemGroup
        orientation="horizontal"
        className={`page-item ${isActive ? "active" : ""}`}
        style={{
          paddingLeft: `${6 + depth * 14}px`,
        }}
        onClick={() => onSelect(page.id)}
        onMouseOver={() => setShouldShow(true)}
        onMouseLeave={() => setShouldShow(false)}
      >
        {/* Expand toggle */}
        <Button
          variant="ghost"
          className={`page-expand-btn ${hasChildren ? "visible" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
          style={{
            zIndex: 10,
            opacity: shouldShow && hasChildren ? 1 : 0,
            borderRadius: "var(--tt-radius-sm)",
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
          cover={cover}
          styles={{
            opacity: shouldShow && hasChildren ? 0 : 1,
            transition: "opacity 150ms ease",
          }}
        />
        <Spacer orientation="horizontal" size={0.2} />

        {editing ? (
          <TextareaAutosize
            ref={inputRef}
            cols={40}
            maxRows={1}
            className="page-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="page-item-title">{title || "New Page"}</span>
        )}

        <Spacer orientation="horizontal" />

        <CardItemGroup orientation="horizontal">
          <PageItemOptions
            onOpenChange={(v) => setShouldShow(v)}
            page={page}
            onRenameAsync={async () => setEditing(true)}
          />
          <Button
            style={{
              minWidth: 20,
              width: 20,
              minHeight: 20,
              height: 20,
              opacity: shouldShow ? 1 : 0,
            }}
            variant="ghost"
            tooltip="New page"
            onClick={async (e) => {
              e.stopPropagation();
              await addPageAndActivateAsync({
                title: "New Page",
                parentId: page.id,
              });
            }}
          >
            <Plus size={12} className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
      </CardItemGroup>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="page-item-children">
          {page.children.map((child) => (
            <PageItem key={child.id} page={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
