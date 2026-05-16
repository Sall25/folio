import { BookCard } from "./book-card";
import type { Book } from "./types";
import { MOCK_BOOKS } from "./data/mock-books";
import "./book-grid.scss";

interface BookGridProps {
  books?: Book[];
}

export function BookGrid({ books = MOCK_BOOKS }: BookGridProps) {
  return (
    <div className="book-grid">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}
