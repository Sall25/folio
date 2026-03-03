import type { Editor } from "@tiptap/core"
import { type Comment } from "../types"

import './messages.scss'
import { useState, useRef, useEffect } from "react"
import { Card, CardGroupLabel, CardItemGroup } from "../../card"
import { Button } from "../../button"
import { ReplyBox } from "./replyBox"
import { Profile } from "./profile"
import { scrollToComment } from "../plugins/utils"

export function Messages({
  comment,
  editor,
}: {
  comment: Comment
  editor: Editor
}) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)

  //  Close reply box when clicking outside
  useEffect(() => {
    const editorDom = editor.view.dom as HTMLElement | null
    if (!editorDom) return

    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setActive(false)
      }
    }

    editorDom.addEventListener('mousedown', handleClickOutside)

    //document.addEventListener("mousedown", handleClickOutside)
    return () =>
      editorDom.removeEventListener('mousedown', handleClickOutside)
    //document.removeEventListener("mousedown", handleClickOutside)
  }, [editor])

  return (
    <Card
      ref={containerRef}
      className="messages"
      onMouseDown={() => {
        setActive(true)
      }}
    >
      {comment.messages.map(m => (
        <CardItemGroup
          key={m.id}
          style={{
            width: '100%',
            gap: '15px'
          }}
          onMouseDown={() => scrollToComment(comment.id)}
        >
          <CardItemGroup
          >
            <CardItemGroup
              orientation="horizontal"
              style={{
                padding: '10px 0'
              }}
            >
              <Profile
              />
              <CardItemGroup
                style={{
                  gap: '0'
                }}
              >
                <CardGroupLabel
                  style={{
                    fontWeight: 'bolder',
                    margin: 0,
                    padding: 0
                  }}
                >
                  {m.authorId}
                </CardGroupLabel>
                <CardGroupLabel
                  style={{
                    fontSize: '10px',
                    margin: 0,
                    fontWeight: '600',
                    padding: '3px 0'
                  }}
                >
                  00:23 Aujourd’hui
                </CardGroupLabel>
              </CardItemGroup>
            </CardItemGroup>
            <CardGroupLabel
              style={{
                width: '100%',
                maxWidth: '240px',
                lineHeight: '22px',
                fontWeight: 'normal',
                // background: 'transparent'
              }}
              className="message"
            >
              {m.text}
            </CardGroupLabel>
          </CardItemGroup>
        </CardItemGroup>
      ))}

      {active && !comment.draft && (
        <CardItemGroup
          style={{
            width: '100%'
          }}
        >
          <ReplyBox
            onSubmit={(text) =>
              editor.commands.replyComment(comment.id, text, "You")
            }
          />

        </CardItemGroup>
      )}

      {comment.draft && (
        <CardItemGroup
          orientation="vertical"
          className="message-draft"
        >
          <input
            className='message-input'
            style={{
              maxWidth: '240px',
            }}
            autoFocus
            value={text}
            //value={draft.text}
            placeholder="Write a comment…"
            onChange={e => {
              setText(e.target.value)
              editor.commands.updateDraft(e.target.value)
            }}
          />

          <CardItemGroup
            orientation="horizontal"
          >
            <Button
              className="cancel-button"
              onClick={() => {
                const currentCommentId = editor.storage.commentExtension.currentCommentId
                if (!currentCommentId) return
                editor.commands.removeComment(currentCommentId)
              }}
            >
              Cancel
            </Button>
            <Button
              className="submit-button"
              onClick={() => {
                editor.commands.submitDraft()
              }}
            >
              Submit
            </Button>
          </CardItemGroup>
        </CardItemGroup>
      )}
    </Card>
  )
}





// export function Messages({
//   comment,
//   editor,
// }: {
//   comment: Comment
//   editor: Editor
// }) {
//   const [active, setActive] = useState(false)
//   const [text, setText] = useState("")
//   const containerRef = useRef<HTMLDivElement | null>(null)

//   //  Close reply box when clicking outside
//   useEffect(() => {
//     function handleClickOutside(e: MouseEvent) {
//       if (!containerRef.current) return
//       if (!containerRef.current.contains(e.target as Node)) {
//         setActive(false)
//       }
//     }

//     document.addEventListener("mousedown", handleClickOutside)
//     return () =>
//       document.removeEventListener("mousedown", handleClickOutside)
//   }, [])

//   function handleReply() {
//     if (!text.trim()) return
//     editor.commands.replyComment(comment.id, text, "You")
//     setText("")
//     setActive(false)
//   }

//   return (
//     <Card className="messages" ref={containerRef}>
//       {/* STACKED COMMENTS */}
//       <CardItemGroup
//         orientation="vertical"
//         style={{ width: "100%", gap: "15px" }}
//       >
//         {comment.messages.map((m) => (
//           <CardItemGroup
//             key={m.id}
//             orientation="vertical"
//             onClick={() => setActive(true)}
//             style={{ cursor: "pointer" }}
//           >
//             <CardGroupLabel style={{ fontWeight: "bold" }}>
//               {m.authorId}
//             </CardGroupLabel>

//             <CardGroupLabel className="message">
//               {m.text}
//             </CardGroupLabel>
//           </CardItemGroup>
//         ))}
//       </CardItemGroup>

//       {/*  SINGLE REPLY BOX AT BOTTOM */}
//       {active && (
//         <CardItemGroup
//           orientation="vertical"
//           style={{
//             marginTop: "20px",
//             gap: "10px",
//           }}
//         >
//           <ReplyBox
//             //           value={text}
//             //           onChange={setText}
//             onSubmit={handleReply}
//           />

//           <CardItemGroup
//             orientation="horizontal"
//             style={{
//               justifyContent: "flex-end", //  buttons to right
//               gap: "10px",
//             }}
//           >
//             <Button
//               className="cancel-button"
//               onClick={() => {
//                 setActive(false)
//                 setText("")
//               }}
//             >
//               Cancel
//             </Button>

//             <Button
//               className="submit-button"
//               onClick={handleReply}
//             >
//               Reply
//             </Button>
//           </CardItemGroup>
//         </CardItemGroup>
//       )}
//     </Card>
//   )
// }