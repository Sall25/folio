export type Comment = {
  id: string;
  threadId: string;
  authorId: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
};

export type ThreadStatus =
  | "active"
  | "resolved"
  | "drafted"
  | "open"
  | "deleted";

export type Thread = {
  id: string;
  content: string;
  anchor: {
    from: number;
    to: number;
  };
  comments: Comment[];
  status: ThreadStatus;
  pageId?: string;
};

export type MeasuredThread = {
  id: string;
  from: number;
  to: number;
  anchorTop: number;
  height: number;
};

export type PositionedThread = MeasuredThread & { resolvedTop: number };
