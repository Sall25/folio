import { CardItemGroup } from "@/components/tiptap-ui-primitive/card";
import { Profile } from "./profile";
import { CardGroupLabel } from "@/components/tiptap-ui-primitive/card";
import type { CommentMessage } from "../types";
import { Button } from "@/components/tiptap-ui-primitive/button";
import type { Editor } from "@tiptap/core";
import { useRef, useState, type SetStateAction } from "react";
import { scrollToComment } from "../../plugins/utils";

import './message.scss'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tiptap-ui-primitive/popover";
import { Check, Edit, MoreHorizontal, Trash } from "lucide-react";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";

function MessagePopover({ message, firstMessage = true }: { message: CommentMessage, firstMessage?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
        >
          <MoreHorizontal
            className="tiptap-button-icon"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="tiptap-card message-popover-content"
        align="end"
        style={{
          padding: '5px 10px',

        }}
      >
        {firstMessage && (
          <>
            {/* Resolve */}
            <Button
              variant="ghost"
              className="message-popover-item"
            >
              <Check size={12} />
              <span>Resolve</span>
            </Button>
          </>
        )}
        {/* Edit */}
        <Button
          className="message-popover-item"
          type="button"
          variant="ghost"
        >
          <Edit size={12}
          />
          <span>Edit</span>
        </Button>
        <Spacer orientation="vertical" />
        {/* Delete */}
        <Button
          className="message-popover-item"
          type="button"
          variant="ghost"
        >
          <Trash
            size={12}
          />
          <span>Delete</span>
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function User({ message }: { message: CommentMessage }) {
  return (
    <CardItemGroup
      orientation="horizontal"
      style={{
        padding: '5px 0'
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
            padding: 0,
            fontSize: '11px'
          }}
        >
          {message.authorId}
        </CardGroupLabel>
        <CardGroupLabel
          style={{
            fontSize: '10px',
            margin: 0,
            fontWeight: '600',
            padding: '3px 0',
          }}
        >
          00:23 Aujourd’hui
        </CardGroupLabel>
      </CardItemGroup>
    </CardItemGroup>
  )
}

interface BodyProps {
  message: CommentMessage
  editor: Editor
  open?: boolean
  firstMessage?: boolean
}
function Body({ message, editor, open = false, firstMessage = true }: BodyProps) {

  const messageBoxRef = useRef<HTMLTextAreaElement | null>(null)
  const [text, setText] = useState(message.text)

  const handleInput = () => {
    if (!messageBoxRef.current) return

    const el = messageBoxRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (e: any) => {
    setText(e.target.value)
  }

  return (
    <CardItemGroup
      style={{
        padding: '3px',
        gap: '2px'
      }}
    >

      <CardItemGroup
        orientation="horizontal"
        style={{
          justifyContent: 'space-between'
        }}
      >
        {/* User */}
        <User
          message={message}
        />

        {/* Controls */}
        {open && (
          <MessagePopover
            message={message}
            firstMessage={firstMessage}
          />
        )}
      </CardItemGroup>

      <textarea
        className="message-input"
        value={text}
        // readOnly={true}
        onInput={handleInput}
        onChange={handleInputChange}
        onSubmit={() => {
          console.log('message', text)
        }}
      />

    </CardItemGroup>
  )
}


interface MessageProps {
  message: CommentMessage
  editor: Editor
  firstMessage?: boolean
  open?: boolean
}
export function Message({ message, editor, firstMessage = true, open = false }: MessageProps) {
  return (
    // <CardItemGroup
    //   orientation="vertical"
    //   onMouseDown={() => scrollToComment(message.id)}
    //   style={{
    //     width: '100%'
    //   }}
    // >

    // </CardItemGroup>
    <Body
      message={message}
      editor={editor}
      firstMessage={firstMessage}
      open={open}
    >

    </Body>
  )
}