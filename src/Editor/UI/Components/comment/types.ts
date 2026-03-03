export type CommentMessage = {
  id: string
  authorId: string
  text: string
  createdAt: number
  editedAt?: number
}

export type CommentDraft = {
  text: string
}

export type Comment = {
  id: string;

  anchor: {
    from: number
    to: number
  }

  authorId: string
  createdAt: number
  updatedAt?: number

  messages: CommentMessage[]

  status: 'active' | 'detached'

  draft?: CommentDraft | null
}

export type CommentRuntime = {
  comments: Map<string, Comment>
}

export type MeasuredComment = {
  id: string
  from: number
  to: number
  anchorTop: number
  height: number
}

export type PositionedComment = MeasuredComment & { resolvedTop: number }