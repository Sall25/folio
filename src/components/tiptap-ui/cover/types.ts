export type Target = "Emoji" | "Icons" | "Upload";

export type CoverTab = "reposition" | "unsplash" | "gradient" | "url";

export type GradientPreset = {
  label: string;
  value: string;
};

export type UnsplashPhoto = {
  id: string;
  urls: { small: string; regular: string; full: string };
  alt_description: string | null;
  user: { name: string; links: { html: string } };
};
