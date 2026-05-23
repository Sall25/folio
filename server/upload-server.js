import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(cors());
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, true);
  },
  // fileFilter: (_req, file, cb) => {
  //   cb(null, file.mimetype.startsWith("image/"));
  // },
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ url });
});

app.listen(PORT, () => console.log(`Upload server running on port ${PORT}`));

app.get("/api/uploads", (_req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR).map((filename) => ({
    filename,
    url: `http://localhost:${PORT}/uploads/${filename}`,
  }));
  res.json(files);
});

app.get("/api/bookmark", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    // Try direct fetch first
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();

    const get = (pattern) => html.match(pattern)?.[1]?.trim() ?? null;

    const title =
      get(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ??
      get(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i) ??
      get(/<title[^>]*>([^<]+)<\/title>/i) ??
      null;

    const description =
      get(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ??
      get(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i) ??
      get(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ??
      get(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i) ??
      null;

    const image =
      get(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ??
      get(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i) ??
      null;

    const origin = new URL(url).origin;
    const favicon = `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;

    res.json({ title, description, image, favicon, url });
  } catch (err) {
    // Fallback — return just the URL info without metadata
    try {
      const parsed = new URL(url);
      res.json({
        title: parsed.hostname.replace("www.", ""),
        description: null,
        image: null,
        favicon: `https://www.google.com/s2/favicons?domain=${parsed.origin}&sz=32`,
        url,
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch URL" });
    }
  }
});
