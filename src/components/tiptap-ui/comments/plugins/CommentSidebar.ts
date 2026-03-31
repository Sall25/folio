import { Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import type { Comment, MeasuredComment, PositionedComment } from "../comment/types";
import type { Editor } from "@tiptap/core";
import { commentSectionPluginKey, type CommentState } from "./CommentSection";

interface CommentSidebarProps {
  editor: Editor
  onActiveCommentChange?: (activeCommentId: string | null) => void
}

export type CommentSidebarState = {
  measuredComments: MeasuredComment[]
  positionedComments: PositionedComment[]
  activeCommentId: string | null
}

export const commentSidebarPluginKey = new PluginKey('commentSidebarPlugin')

export const CommentSidebarPlugin = ({ editor, onActiveCommentChange }: CommentSidebarProps) => {
  //  let raf: RequestAnimationFrame = null
  // const COMMENT_SECTION_HEIGHT = 150

  function measureAllComments(editor: Editor, comments: Comment[]): MeasuredComment[] {
    const scrollY = window.scrollY


    return comments
      .filter(c => c.status === 'active')
      .map(c => {
        const { top } = editor.view.coordsAtPos(c.anchor.from)

        const el = document.querySelector(
          `[data-comment-thread-id="${c.id}"]`
        ) as HTMLElement | null

        const height = el?.offsetHeight ?? 150

        // console.log(el)
        return {
          id: c.id,
          from: c.anchor.from,
          to: c.anchor.to,
          anchorTop: top + scrollY,
          height
        }
      })
  }
  const mapComments = (tr: Transaction, comments: Comment[]) => {
    for (const c of comments) {
      const nextFrom = tr.mapping.mapResult(c.anchor.from)
      const nextTo = tr.mapping.mapResult(c.anchor.to)
      if (nextFrom.deleted || nextTo.deleted) {
        c.status = 'detached'
      } else {
        c.anchor.from = nextFrom.pos
        c.anchor.to = nextTo.pos
      }
    }
    return comments
  }
  

  const resolveCollisions = (measuredComments: MeasuredComment[]) => {
    const GAP = 12
    let cursor = 0

    return measuredComments
      .sort((a, b) => a.anchorTop - b.anchorTop)
      .map(comment => {
        const top = Math.max(comment.anchorTop, cursor)
        cursor = top + comment.height + GAP

        return { ...comment, resolvedTop: top }
      })
  }

  function resolveActiveCollisions(
    comments: MeasuredComment[],
    activeId: string
  ): PositionedComment[] {

    const GAP = 12

    const sorted = [...comments].sort(
      (a, b) => a.anchorTop - b.anchorTop
    )

    const activeIndex = sorted.findIndex(c => c.id === activeId)

    const resolved = sorted.map(c => ({
      ...c,
      resolvedTop: c.anchorTop
    }))

    // push downward
    for (let i = activeIndex + 1; i < resolved.length; i++) {
      const prev = resolved[i - 1]
      const curr = resolved[i]

      const minTop = prev.resolvedTop + prev.height + GAP

      curr.resolvedTop = Math.max(curr.anchorTop, minTop)
    }

    // push upward
    for (let i = activeIndex - 1; i >= 0; i--) {
      const next = resolved[i + 1]
      const curr = resolved[i]

      const maxTop = next.resolvedTop - curr.height - GAP

      curr.resolvedTop = Math.min(curr.anchorTop, maxTop)
    }

    return resolved.map(comment => ({
      ...comment,
      offset: comment.resolvedTop - comment.anchorTop
    }))
  }

  return {
    plugin: new Plugin<CommentSidebarState>({
      key: commentSidebarPluginKey,

      state: {
        init: () => {
          return {
            measuredComments: [],
            positionedComments: [],
            activeCommentId: null
          }
        },

        apply(tr, prev, _, newState) {
          const next = { ...prev }

          const sectionState: CommentState = commentSectionPluginKey.getState(newState)
          const { comments } = sectionState

          mapComments(tr, comments)

          if (tr.docChanged || tr.getMeta('commentUpdated') || tr.getMeta('forceMeasure')) {
            const measured = measureAllComments(editor, comments)
            const positioned = resolveCollisions(measured)

            next.measuredComments = measured
            next.positionedComments = positioned
          }

          if (tr.getMeta('active-comment')) {
            const measured = measureAllComments(editor, comments)
            let positioned = resolveCollisions(measured)
            const meta = tr.getMeta('active-comment')
            if (meta) {
              const { activeId } = meta
              positioned = resolveActiveCollisions(measured, activeId)

            }

            next.measuredComments = measured
            next.positionedComments = positioned

          }

          if (tr.getMeta('setActiveCommentId')) {
            const meta = tr.getMeta('setActiveCommentId')
            next.activeCommentId = meta.id
          }

          return next
        },
      },

      view: () => {

        return {
          update(editorView) {

            let lastActive: string | null = null

            const computeActive = () => {
              const sectionState = commentSectionPluginKey.getState(editorView.state)
              if (!sectionState) return

              const { comments } = sectionState
              const { from, to } = editorView.state.selection

              let activeId: string | null = null

              for (const c of comments) {
                const overlaps =
                  c.anchor.from <= to &&
                  c.anchor.to >= from &&
                  c.status === "active"

                if (overlaps) {
                  activeId = c.id
                  break
                }
              }

              // Only notify if it actually changed
              if (activeId !== lastActive) {
                lastActive = activeId
                onActiveCommentChange?.(activeId)
              }

            }
            computeActive()
          },
        }
      }

    })
  }
}