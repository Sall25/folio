import { useEffect, useRef, useState } from "react";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { PageItemIcon } from "./page-item-icon";
import { PageItemOptions } from "./page-item-options";
import { Plus } from "lucide-react";
import type { ID, Page } from "src/types";

import "./page-item.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { useActivePage } from "./context/active-page-context";
import { useCreatePage } from "src/hooks/use-create-page";
import { makeChildPage } from "src/utils/make-page";

interface PageItemProps {
  page: Page;
  depth?: number;
  disableActive?: boolean;
  showIcon?: boolean;
}

export function PageItem({
  page,
  depth = 0,
  disableActive = false,
  showIcon = true,
}: PageItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const [shouldShow, setShouldShow] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { activePageId, setActivePageId } = useActivePage();

  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const mutateAsyncRef = useRef(mutateAsync);
  const createPage = useCreatePage();

  const isActive = activePageId === page.id && !disableActive;
  const title = page.title || "New Page";

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDraft(page.title));
    return () => cancelAnimationFrame(raf);
  }, [page.title]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.title) {
      // optimistic title patch via your hook
      await mutateAsyncRef.current({ id: page.id, patch: { title: trimmed } });
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

  // ── the switching logic you wanted here ──────────────────────────────────
  const onSelect = (pageId: ID) => {
    setActivePageId(pageId);
  };

  return (
    <div className="page-item-tree">
      <Spacer orientation="vertical" size={1.4} />
      <CardItemGroup
        orientation="horizontal"
        className={`page-item ${isActive ? "active" : ""}`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        onClick={() => onSelect(page.id)}
        onMouseOver={() => setShouldShow(true)}
        onMouseLeave={() => setShouldShow(false)}
      >
        {showIcon && (
          <PageItemIcon
            cover={page.cover}
            styles={{
              width: 18,
              height: 18,
              opacity: 1,
              fontSize: 16,
            }}
          />
        )}
        <Spacer orientation="horizontal" size={0.5} />

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
          <span
            className="page-item-title"
            style={{ paddingLeft: !showIcon ? 15 : 0 }}
          >
            {title}
          </span>
        )}

        <CardItemGroup
          orientation="horizontal"
          className="page-item-actions"
          style={{ maxWidth: shouldShow ? "fit-content" : 0 }}
        >
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
              const child = makeChildPage(page, "New Page"); // your makePage seeded with parentId
              createPage.mutate(child);
              setActivePageId(child.id); // client id known up front — activate immediately
            }}
          >
            <Plus size={12} className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
      </CardItemGroup>
    </div>
  );
}
