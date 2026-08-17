// TocNodeView.tsx
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useTocActions, useTocContent } from './toc-context'


export function TocNodeView({ node }: ReactNodeViewProps) {
  const { topOffset, maxShowCount, showTitle } = node.attrs
  const { navigateToHeading, normalizeDepths } = useTocActions()
  const {tocContent} = useTocContent()

  const items = tocContent.slice(0, maxShowCount)
  const depths = normalizeDepths(items)

  return (
    <NodeViewWrapper data-type="toc-node" contentEditable={false}>
      <div className="toc-node">
        {showTitle && <p className="toc-node__title">Table of contents</p>}

        {items.length === 0 ? (
          <p className="toc-node__empty">Add headings to generate a table of contents.</p>
        ) : (
          <nav>
            {items.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="toc-node__item"
                style={{ paddingLeft: `${(depths[i] - 1) * 16 + 8}px` }}
                onClick={(e) => {
                  e.preventDefault()
                  navigateToHeading(item, topOffset)
                }}
              >
                {item.textContent}
              </a>
            ))}
          </nav>
        )}
      </div>
    </NodeViewWrapper>
  )
}