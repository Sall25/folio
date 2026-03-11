import { useCallback, useMemo } from 'react'

import { useThreadState } from '../context/useThreadState.js'
import { CommentCard } from './comment-card.js'
import { ThreadCard } from './thread-card.js'
import { ThreadComposer } from './thread-composer.js'
import type { PositionedThread, Thread } from '../types/index.js'
import type { Editor } from '@tiptap/core'

import { ButtonGroup } from '@/components/tiptap-ui-primitive/button/button.js'
import { scrollToThread } from '../extensions/utils/scrollToThread.js'


import { ThreadComposerSubmit } from './thread-composer-submit.js'

import './thread-list-item.scss'

interface ThreadListItemProps {
  thread: Thread
  editor: Editor
  active: boolean
  open: boolean
  layout: PositionedThread
}

export const ThreadsListItem = ({ thread, editor, active, open, layout }: ThreadListItemProps) => {
  const { onClickThread, deleteThread, onHoverThread, onLeaveThread, resolveThread, unresolveThread } =
    useThreadState()
  const classNames = ['threadsList--item']

  if (active || open) {
    classNames.push('threadsList--item--active')
  }

  const comments = useMemo(() => thread.comments, [thread])

  const firstComment = comments?.[0]

  const handleDeleteClick = useCallback(() => {
    deleteThread?.(thread.id)
  }, [thread.id, deleteThread])

  const handleResolveClick = useCallback(() => {
    resolveThread?.(thread.id)
  }, [thread.id, resolveThread])

  const handleUnresolveClick = useCallback(() => {
    unresolveThread?.(thread.id)
  }, [thread.id, unresolveThread])


  return (
    <div
      data-thread-list-item-id={thread.id}
      className='thread-list-item'
      style={{
        top: layout.anchorTop,
        transform: `translateY(${layout.resolvedTop - layout.anchorTop}px)`,
        width: '280px'
      }}
      onMouseEnter={() => onHoverThread?.(thread.id)}
      onMouseLeave={() => onLeaveThread?.(thread.id)}
    >
      <ThreadCard
        id={thread.id}
        active={active}
        open={open}
        onClick={!open && thread.status !== 'drafted' ?
          (threadId: string) => {
            onClickThread?.(threadId)
            scrollToThread(threadId)
          } : null}
        onClickOutside={() => {
          editor.commands.unselectThread()
        }}
      // onClickOutside
      >
        {open ? (
          <>
            <div className="header-group">
              <ButtonGroup orientation='horizontal'>
                {thread.status === 'active' ? (
                  <button className='tiptap-button' type="button" onClick={handleResolveClick}>
                    ✓ Resolve
                  </button>
                ) : (
                  <button className='tiptap-button' type="button" onClick={handleUnresolveClick}>
                    ⟲ Unresolve
                  </button>
                )}
                <button className='tiptap-button' type="button" onClick={handleDeleteClick}>
                  × Delete
                </button>
              </ButtonGroup>
            </div>

            {thread.status === 'resolved' ? (
              <div className="hint">
                💡 Resolved at
              </div>
            ) : null}

            <div className="comments-group">
              {comments.map(comment => (
                <CommentCard
                  key={comment.id}
                  name={comment.authorId}
                  content={comment.text}
                  createdAt={comment.createdAt}
                  deleted={false}
                  onEdit={(val) => {
                    editor.commands.updateComment(thread.id, comment.id, val)
                  }}
                  onDelete={() => {
                    editor.commands.removeComment(thread.id, comment.id)
                  }}
                  showActions={true}
                />
              ))}
            </div>
            <div className="reply-group">
              <ThreadComposer
                editor={editor}
                threadId={thread.id}
              />
            </div>
          </>
        ) : null}

        {!open && firstComment ? (
          <div className="comments-group">
            <CommentCard
              key={firstComment.id}
              name={firstComment.authorId}
              content={firstComment.text}
              createdAt={firstComment.createdAt}
              deleted={false}
              onDelete={() => {
                editor.commands.removeComment(thread.id, firstComment.id)
              }}
              onEdit={() => {


                // if (val) {
                //   editComment(firstComment.id, val)
                // }
              }}
              showActions={false}
            />
            <div className="comments-count">
              <label>
                {Math.max(0, comments.length - 1) || 0} {(comments.length - 1 || 0) === 1 ? 'reply' : 'replies'}
              </label>
            </div>
          </div>
        ) : null}

        {thread.status === 'drafted' && (
          <ThreadComposerSubmit editor={editor} threadId={thread.id} />
          // <CardItemGroup
          //   orientation="vertical"
          //   className="message-draft"
          // >
          //   <input
          //     className='message-input'
          //     style={{
          //       maxWidth: '240px',
          //     }}
          //     autoFocus
          //     value={text}
          //     placeholder="Write a comment…"
          //     onChange={e => {
          //       setText(e.target.value)
          //     }}
          //   />

          //   <CardItemGroup
          //     orientation="horizontal"
          //   >
          //     <Button
          //       className="cancel-button"
          //       onClick={() => {
          //         editor.commands.removeThread(thread.id)

          //       }}
          //     >
          //       Cancel
          //     </Button>
          //     <Button
          //       className="submit-button"
          //       onClick={() => {
          //         editor.commands.submitThread(text)
          //       }}
          //     >
          //       Submit
          //     </Button>
          //   </CardItemGroup>
          // </CardItemGroup>
        )}
      </ThreadCard>
    </div>
  )
}