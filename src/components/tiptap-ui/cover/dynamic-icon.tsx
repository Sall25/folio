import type { LucideProps } from "lucide-react";
import {
  createElement,
  useEffect,
  useState,
  type FunctionComponent,
} from "react";

// The full lucide-react namespace (~1400 icons) is loaded ON DEMAND the first
// time any page icon renders, then cached for the session — so it lives in its
// own chunk instead of the boot bundle. A saved page icon can be ANY lucide
// icon (the picker offers all), so we resolve by name off the namespace rather
// than keeping a static map.
type LucideModule = Record<string, unknown>;

let cachedModule: LucideModule | null = null;
let modulePromise: Promise<LucideModule> | null = null;

function loadLucide(): Promise<LucideModule> {
  if (cachedModule) return Promise.resolve(cachedModule);
  if (!modulePromise) {
    modulePromise = import("lucide-react").then((mod) => {
      cachedModule = mod as LucideModule;
      return cachedModule;
    });
  }
  return modulePromise;
}

export const DynamicIcon = ({
  name,
  ...props
}: { name: string } & LucideProps) => {
  // If the namespace is already cached (common after first render), resolve
  // synchronously so there's no flash on subsequent icons.
  const [mod, setMod] = useState<LucideModule | null>(cachedModule);

  useEffect(() => {
    if (mod) return;
    let active = true;
    loadLucide().then((m) => {
      if (active) setMod(m);
    });
    return () => {
      active = false;
    };
  }, [mod]);

  if (!mod) return null; // brief: only before the namespace chunk first loads

  const Icon = mod[name];
  // Lucide icon components are objects (forwardRef), so guard accordingly.
  if (!Icon || (typeof Icon !== "object" && typeof Icon !== "function")) {
    return null;
  }
  return createElement(Icon as FunctionComponent, props);
};
