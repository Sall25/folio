import { Editor } from "@tiptap/core"
import { type ReactNode } from "react"

type rowMenuProps = {
  editor: Editor
  className?: string
  children: ReactNode
}

export const RowMenu = (props: rowMenuProps) => {
  const { children, className } = props

  return (
    <div
      className={className}
    >
      {children}
    </div>
  )
}