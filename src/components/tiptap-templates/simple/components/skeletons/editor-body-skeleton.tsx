import { Bone } from "../../../../tiptap-ui-primitive/bone/bone";
import type { JSONContent } from "@tiptap/core";
import "./editor-body-skeleton.scss";

/**
 * Content-aware editor body skeleton. Because page.content is already loaded
 * (from json-server, via activePage) before the Yjs doc syncs, we know the
 * real node structure up front — so instead of generic bars, we render a
 * skeleton shaped like the actual page: a heading looks like a heading, an
 * image like an image block, a table like a grid, etc. Result: the loading
 * state closely previews the real page, and there's minimal reflow on swap.
 *
 * Reuses .simple-editor-content (+ data attrs) so it inherits the editor's
 * exact content width/centering. No cover/icon — those are already on screen.
 */

// ── A few paragraph-ish lines, varied widths, deterministic per key ──────
function TextLines({ count = 3, seed = 0 }: { count?: number; seed?: number }) {
  // Deterministic widths so it doesn't reshuffle on every render.
  const widths = ["100%", "97%", "90%", "94%", "72%", "85%", "60%", "88%"];
  return (
    <div className="ebs-lines">
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} width={widths[(seed + i) % widths.length]} height={15} />
      ))}
    </div>
  );
}

// ── Per-node skeleton ────────────────────────────────────────────────────
function NodeSkeleton({ node, index }: { node: JSONContent; index: number }) {
  const type = node.type;

  switch (type) {
    case "title":
      return <Bone width="52%" height={40} rounded className="ebs-title" />;

    case "heading": {
      // Size by level: h1 biggest, h3 smallest.
      const level = (node.attrs?.level as number) ?? 1;
      const height = level === 1 ? 30 : level === 2 ? 25 : 21;
      const width = level === 1 ? "45%" : level === 2 ? "38%" : "32%";
      return (
        <Bone
          width={width}
          height={height}
          rounded
          className={`ebs-heading ebs-heading--h${level}`}
        />
      );
    }

    case "paragraph": {
      // Empty paragraph → a single short line; else a small block.
      const isEmpty = !node.content || node.content.length === 0;
      return <TextLines count={isEmpty ? 1 : 3} seed={index} />;
    }

    case "image":
      return <Bone width="100%" height={280} className="ebs-image" />;

    case "bookmark":
      return <Bone width="100%" height={80} className="ebs-bookmark" />;

    case "callout":
      return (
        <div className="ebs-callout">
          <Bone width={22} height={22} rounded className="ebs-callout__icon" />
          <div className="ebs-callout__body">
            <TextLines count={2} seed={index} />
          </div>
        </div>
      );

    case "blockquote":
      return (
        <div className="ebs-blockquote">
          <TextLines count={2} seed={index} />
        </div>
      );

    case "codeBlock":
      return (
        <div className="ebs-codeblock">
          <Bone width="70%" height={13} />
          <Bone width="85%" height={13} />
          <Bone width="55%" height={13} />
          <Bone width="78%" height={13} />
        </div>
      );

    case "horizontalRule":
      return <Bone width="100%" height={1} className="ebs-hr" />;

    case "bulletList":
    case "orderedList": {
      const items = node.content?.length ?? 3;
      return (
        <div className="ebs-list">
          {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="ebs-list__item">
              <Bone width={6} height={6} rounded className="ebs-list__marker" />
              <Bone width={`${80 - (i % 3) * 10}%`} height={15} />
            </div>
          ))}
        </div>
      );
    }

    case "taskList": {
      const items = node.content?.length ?? 3;
      return (
        <div className="ebs-list">
          {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="ebs-list__item">
              <Bone width={14} height={14} className="ebs-task__check" />
              <Bone width={`${78 - (i % 3) * 8}%`} height={15} />
            </div>
          ))}
        </div>
      );
    }

    case "tableWrapper":
    case "table": {
      // Rough grid — 3 rows x 3 cols.
      return (
        <div className="ebs-table">
          {Array.from({ length: 3 }).map((_, r) => (
            <div key={r} className="ebs-table__row">
              {Array.from({ length: 3 }).map((__, c) => (
                <Bone
                  key={c}
                  width="100%"
                  height={32}
                  className="ebs-table__cell"
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    case "columnBlock": {
      const cols = node.content?.length ?? 2;
      return (
        <div className="ebs-columns">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="ebs-columns__col">
              <TextLines count={3} seed={index + i} />
            </div>
          ))}
        </div>
      );
    }

    case "database":
      // Database node — a header row + several rows, like a table view.
      return (
        <div className="ebs-database">
          <Bone width="30%" height={20} className="ebs-database__title" />
          <div className="ebs-database__grid">
            {Array.from({ length: 4 }).map((_, r) => (
              <Bone
                key={r}
                width="100%"
                height={36}
                className="ebs-database__row"
              />
            ))}
          </div>
        </div>
      );

    case "tocNode":
      return (
        <div className="ebs-toc">
          <Bone width="40%" height={13} />
          <Bone width="55%" height={13} />
          <Bone width="48%" height={13} />
        </div>
      );

    case "pageLink":
      return <Bone width="45%" height={24} className="ebs-pagelink" />;

    default:
      // Unknown / unmapped node → safe fallback to a couple of lines.
      return <TextLines count={2} seed={index} />;
  }
}

export const EditorBodySkeleton: React.FC<{
  content?: JSONContent | null;
  size?: string;
  text?: string;
  collapsed?: boolean;
  hasThreads?: boolean;
}> = ({ content, size, text, collapsed, hasThreads }) => {
  const nodes = content?.content ?? [];

  return (
    <div
      className={`top-level-block ebs-root ${hasThreads ? "has-threads" : ""}`}
      data-size={size}
      data-text={text}
      data-collapsed={collapsed ? "true" : "false"}
      role="presentation"
    >
      {nodes.length > 0 ? (
        nodes.map((node, i) => (
          <div key={i} className="ebs-node">
            <NodeSkeleton node={node} index={i} />
          </div>
        ))
      ) : (
        // No content (brand new / empty page) → just a title placeholder.
        <Bone width="52%" height={40} rounded className="ebs-title" />
      )}
    </div>
  );
};
