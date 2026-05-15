import {
  NodeViewContent,
  NodeViewWrapper,
  type JSONContent,
  type NodeViewProps,
} from "@tiptap/react";
import type { TitleCellAttrs } from "./title-cell-node";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DatabaseAttrs } from "../types/types";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { PanelRightOpen } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

import "./title-cell-node-view.scss";
import { findPage } from "src/lib/find-page";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import {
  useActiveViewType,
  useParentDatabase,
} from "../hooks/use-parent-database";
import { BoardCardCover } from "../primitives/board-card-cover";
import { BoardCardContent } from "../primitives/board-card-content";

export function TitleCellNodeView({
  node,
  getPos,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const titleAttrs = node.attrs as TitleCellAttrs;
  const { addPageAsync, pages, updatePageAsync } = usePages();
  const { activePageId } = useActivePage();
  const pageCreationAttempted = useRef(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [textContent, setTextContent] = useState(node.textContent);
  const { setPeekPageId } = usePeekPage();

  const [templateId, setTemplateId] = useState<number | null>(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const n = $pos.node(d);
      if (n.type.name === "database") return n.attrs.templateId ?? null;
    }
    return null;
  });

  useEffect(() => {
    const handler = () => {
      const pos = getPos?.();
      if (pos == null) return;
      const $pos = editor.state.doc.resolve(pos);
      for (let d = $pos.depth; d > 0; d--) {
        const n = $pos.node(d);
        if (n.type.name === "database") {
          setTemplateId(n.attrs.templateId ?? null);
          return;
        }
      }
    };

    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, getPos]);

  const templatePage = useMemo(() => {
    if (!templateId || !pages) return null;
    return findPage(pages, templateId) ?? null;
  }, [templateId, pages]);

  useEffect(() => {
    if (titleAttrs.pageId !== null) return;
    if (pageCreationAttempted.current) return;
    pageCreationAttempted.current = true;

    // Resolve databaseId and recordId from the ProseMirror tree
    const pos = getPos?.();
    let databaseId: string | undefined;
    let recordId: string | undefined;

    if (pos != null) {
      const $pos = editor.state.doc.resolve(pos);
      for (let d = $pos.depth; d > 0; d--) {
        const n = $pos.node(d);
        if (n.type.name === "databaseRecord" && !recordId) {
          recordId = n.attrs.id;
        }
        if (n.type.name === "database" && !databaseId) {
          databaseId = n.attrs.id;
        }
        if (recordId && databaseId) break;
      }
    }

    addPageAsync({
      title: node.textContent,
      parentId: activePageId ?? null,
      databaseId,
      recordId,
    })
      .then((newPage) =>
        updateAttributes({
          ...titleAttrs,
          pageId: newPage.id,
          parentId: activePageId ?? null,
        }),
      )
      .catch((reason) =>
        console.log("failed to add page in title cell node view", reason),
      );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // useEffect(() => {
  //   if (titleAttrs.pageId !== null) return;
  //   if (pageCreationAttempted.current) return;
  //   pageCreationAttempted.current = true;

  //   addPageAsync({
  //     title: node.textContent,
  //     parentId: activePageId ?? null,
  //   })
  //     .then((newPage) =>
  //       updateAttributes({
  //         ...titleAttrs,
  //         pageId: newPage.id,
  //         parentId: activePageId ?? null,
  //       }),
  //     )
  //     .catch((reason) =>
  //       console.log("failed to add page in title cell node view", reason),
  //     );
  // }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!titleAttrs.pageId || !pages) return;
    const page = findPage(pages, titleAttrs.pageId);
    if (!page || page.title === node.textContent) return;

    // Get fresh position — don't use a stale closure
    const pos = getPos?.();
    if (pos == null) return;

    // Validate position is still in range before using it
    if (pos + 1 + node.content.size > editor.state.doc.content.size) return;

    const { tr } = editor.state;
    tr.insertText(page.title, pos + 1, pos + 1 + node.content.size);
    editor.view.dispatch(tr);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeViewType = useActiveViewType(editor, getPos);

  // Add inside the component, after activeViewType is determined
  const isBoardView = activeViewType === "board";

  // Read cardPreview from parent database active view
  const [cardPreview, setCardPreview] = useState<"none" | "cover" | "content">(
    () => {
      const pos = getPos?.();
      if (pos == null) return "none";
      const $pos = editor.state.doc.resolve(pos);
      for (let d = $pos.depth; d > 0; d--) {
        const n = $pos.node(d);
        if (n.type.name === "database") {
          const view = n.attrs.views?.find(
            (v: { id: string }) => v.id === n.attrs.activeViewId,
          );
          return view?.cardPreview ?? "none";
        }
      }
      return "none";
    },
  );

  useEffect(() => {
    const handler = () => {
      const pos = getPos?.();
      if (pos == null) return;
      const $pos = editor.state.doc.resolve(pos);
      for (let d = $pos.depth; d > 0; d--) {
        const n = $pos.node(d);
        if (n.type.name === "database") {
          const view = n.attrs.views?.find(
            (v: { id: string }) => v.id === n.attrs.activeViewId,
          );
          setCardPreview(view?.cardPreview ?? "none");
          return;
        }
      }
    };
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, getPos]);

  // Get the linked page cover
  const linkedPage = useMemo(() => {
    if (!titleAttrs.pageId || !pages) return null;
    return findPage(pages, titleAttrs.pageId) ?? null;
  }, [pages, titleAttrs.pageId]);

  const db = useParentDatabase(editor, getPos);

  if (!db)
    return (
      <NodeViewWrapper as={"div"}>
        <NodeViewContent />
      </NodeViewWrapper>
    );

  const attrs = db.attrs as DatabaseAttrs;

  const prop = attrs.properties.find((p) => p.id === titleAttrs.propertyId);

  if (!prop || prop.config.type !== "title")
    return (
      <NodeViewWrapper as={"div"}>
        <NodeViewContent />
      </NodeViewWrapper>
    );

  // Cover block — only in board view with cardPreview === "cover"
  const coverBlock =
    isBoardView && cardPreview === "cover" ? (
      <BoardCardCover page={linkedPage} recordId={node.attrs.id ?? ""} />
    ) : null;

  const contentBlock =
    isBoardView && cardPreview === "content" ? (
      <BoardCardContent page={linkedPage} />
    ) : null;

  return (
    <NodeViewWrapper
      as="div"
      data-type="title-cell"
      className={`db-td db-td--title ${editing ? "editing" : ""} ${activeViewType === "list" ? "db-td--list" : ""}  ${isBoardView ? "db-td--board" : ""}`}
    >
      {coverBlock}
      {contentBlock}
      <CardItemGroup
        orientation="horizontal"
        className="db-cell-title"
        onClick={() => setEditing(true)}
        onMouseOver={() => setShouldShow(true)}
        onMouseLeave={() => setShouldShow(false)}
      >
        {editing ? (
          <input
            style={{ width: "100%" }}
            autoFocus={true}
            placeholder="New Page"
            value={textContent}
            onChange={(e) => {
              setTextContent(e.target.value);
            }}
            onBlur={() => setEditing(false)}
            className="title-cell-input"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (!textContent.trim()) return;
              const pos = getPos?.();
              if (pos == null) return;
              const { tr } = editor.state;
              tr.insertText(textContent, pos + 1, pos + 1 + node.content.size);
              editor.view.dispatch(tr);
              if (!pages || !titleAttrs.pageId) return;
              const page = findPage(pages, titleAttrs.pageId);
              if (!page) return;
              // Update the title node inside the page content
              const content = page.content as JSONContent;
              const updatedContent: JSONContent = {
                ...content,
                content: content.content?.map((node, i) => {
                  if (i !== 0) return node; // only touch the first node (the title)
                  return {
                    ...node,
                    content: [{ type: "text", text: textContent }],
                  };
                }),
              };
              if (!content.content?.length) {
                updatePageAsync({ ...page, title: textContent });
                return;
              }

              setEditing(false);

              updatePageAsync({
                ...page,
                title: textContent,
                content: updatedContent,
              });
            }}
          />
        ) : (
          <Button
            variant="ghost"
            style={{
              background: "transparent",
              width: "100%",
              justifyContent: "flex-start",
              color: "var(--tt-paragraph-text-color)",
            }}
            onClick={() => setEditing(true)}
          >
            {templatePage && (
              <PageItemIcon
                cover={templatePage.cover}
                styles={{ width: 16, height: 16 }}
              />
            )}
            <span>{node.textContent || "New Page"}</span>
          </Button>
        )}
        {!editing && (
          <>
            <Spacer orientation="horizontal" />
            <Button
              style={{
                minHeight: 18,
                height: 24,
                padding: "0px !important",
                borderRadius: "var(--tt-radius-sm)",
                // border: `${activeViewType !== "table" ? "none" : "1px solid var(--tt-border-color)"}`,
                opacity: `${titleAttrs.pageId !== null && shouldShow ? 1 : 0}`,
                transition: "opacity 0.15s ease",
              }}
              onClick={() => setPeekPageId(titleAttrs.pageId)}
            >
              <PanelRightOpen className="tiptap-button-icon" size={12} />
              <span className="tiptap-button-text">Open</span>
            </Button>
          </>
        )}
      </CardItemGroup>
    </NodeViewWrapper>
  );
}
