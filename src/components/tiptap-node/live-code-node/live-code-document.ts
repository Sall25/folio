// The page a live code block runs: its HTML, CSS and JS in one document, for
// a sandboxed frame (allow-scripts only: no access to Folio, its cookies or
// storage). The frame reports console output and errors to the block by
// postMessage, tagged with the block's channel.
//
// The HTML tab can hold a fragment (<button>…) or a whole page
// (<!DOCTYPE html><html><head>…). In a whole page, the CSS goes where it
// links style.css (or at the end of <head>), the JS where it loads
// script.js (or at the end of <body>): there are no files to fetch, so
// those links are filled in instead.

const escapeClosing = (code: string, tag: string) =>
  code.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);

/** <link … href="style.css" …> (any attribute order, quotes optional). */
const STYLE_LINK = /<link\b[^>]*\bhref\s*=\s*["']?\.?\/?style\.css["']?[^>]*>/gi;
/** <script … src="script.js" …></script>. */
const SCRIPT_TAG =
  /<script\b[^>]*\bsrc\s*=\s*["']?\.?\/?script\.js["']?[^>]*>\s*<\/script>/gi;

function bridgeScript(channel: string): string {
  return `<script>
(function () {
  var channel = ${JSON.stringify(channel)};
  function send(level, args) {
    try {
      parent.postMessage({ source: "folio-live-code", channel: channel, level: level,
        text: Array.prototype.map.call(args, function (a) {
          if (a instanceof Error) return a.message;
          if (typeof a === "object") { try { return JSON.stringify(a); } catch (e) { return String(a); } }
          return String(a);
        }).join(" ") }, "*");
    } catch (e) {}
  }
  ["log", "info", "warn", "error"].forEach(function (level) {
    var original = console[level];
    console[level] = function () { send(level, arguments); original.apply(console, arguments); };
  });
  window.addEventListener("error", function (e) { send("error", [e.message + (e.lineno ? " (line " + e.lineno + ")" : "")]); });
  window.addEventListener("unhandledrejection", function (e) { send("error", [String(e.reason)]); });
})();
</script>`;
}

/** Inserts `what` at the first rule that matches: right after (`after`) or
 *  right before (`before`) a tag; else at the start or the end. */
function insertAt(
  doc: string,
  what: string,
  rules: ({ after: RegExp } | { before: RegExp })[],
  fallback: "start" | "end",
): string {
  for (const rule of rules) {
    const re = "after" in rule ? rule.after : rule.before;
    const m = re.exec(doc);
    if (!m) continue;
    const at = "after" in rule ? m.index + m[0].length : m.index;
    return doc.slice(0, at) + what + doc.slice(at);
  }
  return fallback === "start" ? what + doc : doc + what;
}

const isWholePage = (html: string) => /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html);

export function liveCodeDocument(
  html: string,
  css: string,
  js: string,
  channel: string,
): string {
  const style = `<style>${escapeClosing(css, "style")}</style>`;
  const script = js.trim() ? `<script>${escapeClosing(js, "script")}</script>` : "";
  const base = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`;

  if (!isWholePage(html)) {
    // A fragment: drop links to the files (they're filled in below).
    const body = html.replace(STYLE_LINK, "").replace(SCRIPT_TAG, "");
    return `<!doctype html>
<html>
<head>
${base}
${bridgeScript(channel)}
<style>body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:16px;}</style>
${style}
</head>
<body>
${body}
${script}
</body>
</html>`;
  }

  // A whole page: fill in its links, or add the code where it would go.
  let doc = html;
  let styled = false;
  doc = doc.replace(STYLE_LINK, () => {
    if (styled) return "";
    styled = true;
    return style;
  });
  let scripted = false;
  doc = doc.replace(SCRIPT_TAG, () => {
    if (scripted) return "";
    scripted = true;
    return script;
  });
  if (!styled)
    doc = insertAt(doc, style, [{ before: /<\/head>/i }, { after: /<body[^>]*>/i }], "start");
  if (!scripted && script)
    doc = insertAt(doc, script, [{ before: /<\/body>/i }], "end");
  // The console bridge first, so it sees everything the page logs.
  doc = insertAt(
    doc,
    bridgeScript(channel),
    [{ after: /<head(\s[^>]*)?>/i }, { before: /<body[^>]*>/i }, { after: /<html[^>]*>/i }],
    "start",
  );
  return doc;
}
