import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { COVER_COLORS } from "./data/cover-colors";
import "./book-card.scss";

export type ReadingStatus = "reading" | "done" | "queue";

export interface Book {
  id: string;
  title: string;
  author: string;
  status: ReadingStatus;
  coverColor?: string;
  coverImage?: string;
  course?: string;
}

interface BookCardProps {
  book: Book;
}

const STATUS_LABELS: Record<ReadingStatus, string> = {
  reading: "Reading",
  done: "Done",
  queue: "To read",
};

export function BookCard({ book }: BookCardProps) {
  const coverBg = book.coverColor ?? COVER_COLORS.blue;

  return (
    <Card className="book-card">
      <div className="book-card__cover" style={{ background: coverBg }}>
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="book-card__cover-img"
            draggable={false}
          />
        ) : (
          <span className="book-card__cover-icon" aria-hidden="true">
            📖
          </span>
        )}
      </div>

      <CardBody className="book-card__body">
        <p className="book-card__title" title={book.title}>
          {book.title}
        </p>
        <p className="book-card__author" title={book.author}>
          {book.author}
        </p>

        <div className="book-card__footer">
          <span
            className={`book-card__status book-card__status--${book.status}`}
          >
            {STATUS_LABELS[book.status]}
          </span>

          {book.course && (
            <span className="book-card__course" title={book.course}>
              {book.course}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
