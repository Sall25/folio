import { useCallback, useEffect, useRef, useState } from "react";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { PageItemIcon } from "./page-item-icon";
import { PageItemOptions } from "./page-item-options";
import { ChevronRight, Plus } from "lucide-react";
import type { Page } from "./types";

import "./page-item.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useSimpleEditor } from "./context/simple-editor-context";
import { useActivePageId } from "./context/active-page-context";

interface PageItemProps {
  page: Page;
  depth?: number;
}

export function PageItem({ page, depth = 0 }: PageItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChildren = page.children && page.children.length > 0;
  const [shouldShow, setShouldShow] = useState(false);

  const { activePage, addPageAndActivateAsync, updatePageAsync } =
    useSimpleEditor();
  const { setActivePageId } = useActivePageId();

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
      await updatePageAsync({ ...page, title: trimmed });
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

  const onSelect = useCallback(
    (pageId: string) => {
      setActivePageId(pageId);
    },
    [setActivePageId],
  );

  return (
    <div className="page-item-tree">
      <CardItemGroup
        orientation="horizontal"
        className={`page-item ${activePage?.id === page.id ? "active" : ""}`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        onClick={() => {
          onSelect(page.id);
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
          onRenameAsync={async () => setEditing(true)}
        />
        {shouldShow && (
          <Button
            style={{ minWidth: 6, width: 6, minHeight: 6, height: 6 }}
            variant="ghost"
            tooltip="New page"
            onClick={async () =>
              await addPageAndActivateAsync({
                title: "New Page",
                parentId: page.id,
              })
            }
          >
            <Plus size={6} className="tiptap-button-icon" />
          </Button>
        )}
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
