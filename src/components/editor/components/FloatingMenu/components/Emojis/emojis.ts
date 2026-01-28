import { type EmojiItem } from "@tiptap/extension-emoji";

export const githubStyleEmojis: EmojiItem[] = [
  {
    name: "smile",
    shortcodes: ["smile"],
    tags: ["happy", "joy"],
    emoji: undefined, // optional
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f604.png",
  },
  {
    name: "thumbsup",
    shortcodes: ["thumbsup", "like"],
    tags: ["approve", "ok"],
    emoji: undefined,
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/1f44d.png",
  },
  {
    name: "heart",
    shortcodes: ["heart"],
    tags: ["love", "like"],
    emoji: undefined,
    fallbackImage: "https://github.githubassets.com/images/icons/emoji/unicode/2764.png",
  },
]
