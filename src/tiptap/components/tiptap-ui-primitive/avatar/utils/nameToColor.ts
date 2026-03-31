import { nameToHue } from "./nameToHue";

export function nameToColor(name: string = "") {
  const hue = nameToHue(name)
  return {
    background: `hsl(${hue}, 55%, 52%)`,
    color: `hsl(${hue}, 20%, 96%)`,
  }
}