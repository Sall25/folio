import { describe, expect, it } from "vitest";
import { liveCodeDocument } from "./live-code-document";

describe("liveCodeDocument", () => {
  it("puts a fragment's HTML, CSS and JS in one page", () => {
    const doc = liveCodeDocument("<p>Hi</p>", "p{color:red}", "console.log(1)", "c1");
    expect(doc).toContain("<p>Hi</p>");
    expect(doc).toContain("<style>p{color:red}</style>");
    expect(doc).toContain("<script>console.log(1)</script>");
    expect(doc).toContain('"c1"');
  });

  it("fills in a whole page's link to style.css and script.js", () => {
    const page = `<!DOCTYPE html>
<html>
  <head>
   <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <button>Click me</button>
    <script src="script.js"></script>
  </body>
</html>`;
    const doc = liveCodeDocument(page, "button{color:red}", "alert(1)", "c");
    expect(doc).not.toContain('href="style.css"');
    expect(doc).not.toContain('src="script.js"');
    expect(doc).toMatch(/<head>\s*<script>[\s\S]*folio-live-code[\s\S]*<style>button\{color:red\}<\/style>/);
    expect(doc).toContain("<script>alert(1)</script>");
    expect(doc.match(/<html>/g)).toHaveLength(1);
  });

  it("adds the CSS to a whole page that doesn't link it", () => {
    const doc = liveCodeDocument("<html><head><title>x</title></head><body>b</body></html>", "b{}", "", "c");
    expect(doc).toMatch(/<style>b\{\}<\/style><\/head>/);
  });

  it("can't be closed early by code that writes </script> or </style>", () => {
    const doc = liveCodeDocument("", "a{}</style><b>x</b>", 'var s = "</script><i>";', "c");
    expect(doc).not.toContain("</style><b>");
    expect(doc).not.toContain("</script><i>");
  });
});
