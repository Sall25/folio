import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY ?? "";

async function searchPhotos(query: string) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=18&orientation=landscape`,
    { headers: { Authorization: PEXELS_API_KEY } },
  );
  const data = await res.json();
  return data.photos ?? [];
}

interface PexelsTabProps {
  onSelect: (url: string) => void;
}

export function UnsplashTab({ onSelect }: PexelsTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("nature");
  const [debouncedQuery] = useDebounce(query, 400);

  const { data: photos = [], isFetching } = useQuery({
    queryKey: ["pexels", debouncedQuery],
    queryFn: () => searchPhotos(debouncedQuery),
    placeholderData: keepPreviousData,
    enabled: !!PEXELS_API_KEY,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "100%",
      }}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search photos…"
        style={{
          width: "100%",
          padding: "6px 10px",
          border: "1px solid var(--tt-border-color)",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
          background: "var(--tt-card-bg-color)",
          color: "var(--tt-text-color)",
        }}
      />

      {!PEXELS_API_KEY ? (
        <p
          style={{
            fontSize: 12,
            color: "var(--tt-theme-muted)",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          Add <code>VITE_PEXELS_API_KEY</code> to enable photo search.
        </p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              opacity: isFetching ? 0.5 : 1,
              transition: "opacity 0.2s",
              overflowY: "scroll",
            }}
          >
            {/*eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {photos.map((photo: any) => (
              <button
                key={photo.id}
                onClick={() => onSelect(photo.src.large2x)}
                title={photo.alt || photo.photographer}
                style={{
                  padding: 0,
                  border: "2px solid transparent",
                  borderRadius: 6,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "none",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--tt-brand-color-500)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.borderColor =
                    "transparent")
                }
              >
                <img
                  src={photo.src.medium}
                  alt={photo.alt ?? ""}
                  style={{
                    width: "100%",
                    height: 64,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </button>
            ))}
          </div>

          <p
            style={{
              fontSize: 11,
              color: "var(--tt-theme-muted)",
              textAlign: "center",
            }}
          >
            Photos by{" "}
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noreferrer"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              Pexels
            </a>
          </p>
        </>
      )}
    </div>
  );
}
