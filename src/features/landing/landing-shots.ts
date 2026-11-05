import type { ShotId } from "./landing-copy";
import type { HomeShotId } from "./landing-home-copy";

// Screenshots for the landing's picture slots. Put the image in
// public/landing/ (e.g. public/landing/shot-b.png) and add its path here:
//   B: "/landing/shot-b.png",
// A slot without an image shows a labelled placeholder.
export const LANDING_SHOTS: Partial<Record<ShotId, string>> = {};

// The landing page's screenshots (landing-home.tsx), same way:
export const HOME_SHOTS: Partial<Record<HomeShotId, string>> = {
  rooms: "/landing/rooms.png",
  collaboration: "/landing/collaboration.png",
  databases: "/landing/databases.png",
  teamspaces: "/landing/teamspaces.png",
  comments: "/landing/comments.png",
  chat: "/landing/chat.png",
  sharing: "/landing/sharing.png",
  desktop: "/landing/desktop.png",
  offline: "/landing/offline.png",
};
