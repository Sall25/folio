import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { useDebounce } from "use-debounce";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";

type Emoji = {
  id: string;
  name: string;
  emoji: string;
};

const fetchEmojis = async () => {
  const res = await fetch(
    "https://api.emojisworld.fr/v1/search?q=face&limit=30",
  );
  return res.json();
};

const searchEmoji = async (query: string) => {
  const res = await fetch(
    `https://api.emojisworld.fr/v1/search?q=${query}&limit=30`,
  );
  return res.json();
};
const EMOJIS_PER_ROW = 7;

export function EmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debounceQuery] = useDebounce(query, 300);

  const { data: emojis, isLoading } = useQuery({
    queryKey: ["emojis", debounceQuery],
    queryFn: () =>
      debounceQuery.length > 0 ? searchEmoji(debounceQuery) : fetchEmojis(),
    placeholderData: keepPreviousData,
  });

  const emojiRows = useMemo(() => {
    if (isLoading || !emojis?.results) return [];
    return Array.from(
      { length: Math.ceil(emojis.results.length / EMOJIS_PER_ROW) },
      (_, i) =>
        emojis.results.slice(i * EMOJIS_PER_ROW, (i + 1) * EMOJIS_PER_ROW),
    );
  }, [emojis, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <CardItemGroup orientation="vertical">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search icons…"
        style={{
          width: "100%",
          padding: "6px 10px",
          border: "1px solid var(--tt-border-color)",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
          background: "transparent",
          color: "var(--tt-text-color)",
        }}
      />
      <Spacer orientation="vertical" />
      <CardGroupLabel>Emoji</CardGroupLabel>

      <ButtonGroup
        orientation="vertical"
        style={{
          minWidth: 330,
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
        {isLoading ? (
          <span
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#9ca3af",
              padding: "16px 0",
            }}
          >
            No emojis found
          </span>
        ) : (
          emojiRows!.map((row, rowIndex) => (
            <ButtonGroup key={rowIndex} orientation="horizontal">
              {row.map((emo: Emoji) => (
                <Button
                  key={emo.id}
                  variant="ghost"
                  tooltip={emo.name}
                  style={{
                    fontSize: "24px",
                    // background: "transparent",
                  }}
                  onClick={() => onSelect(emo.emoji)}
                >
                  {emo.emoji}
                </Button>
              ))}
            </ButtonGroup>
          ))
        )}
      </ButtonGroup>
    </CardItemGroup>
  );
}
