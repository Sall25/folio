import { describe, expect, it } from "vitest";
import { firstImageSrc } from "./first-image";

// A card with no cover shows the first image of its page (gallery, board).

const img = (src: string) => ({ type: "image", attrs: { src } });
const p = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("a card's cover from its page", () => {
  it("is the first image, in document order", () => {
    const doc = {
      type: "doc",
      content: [p("intro"), img("https://x/a.png"), img("https://x/b.png")],
    };
    expect(firstImageSrc(doc)).toBe("https://x/a.png");
  });

  it("finds an image inside columns or other blocks before a later one", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "columns",
          content: [{ type: "column", content: [img("https://x/in.png")] }],
        },
        img("https://x/after.png"),
      ],
    };
    expect(firstImageSrc(doc)).toBe("https://x/in.png");
  });

  it("skips images still uploading, and pages without any", () => {
    expect(
      firstImageSrc({
        type: "doc",
        content: [img("blob:http://localhost/1"), img("https://x/c.png")],
      }),
    ).toBe("https://x/c.png");
    expect(firstImageSrc({ type: "doc", content: [p("text only")] })).toBeNull();
    expect(firstImageSrc(null)).toBeNull();
  });
});
