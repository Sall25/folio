import { ThemeToggle } from "./ThemeToggle";

export default function Toolbar() {
  return (
    <div
      className="
        sticky top-0
        z-10
        flex items-center justify-end
        px-4 py-1 h-10
        bg-white dark:bg-neutral-900
        border-b border-neutral-200 dark:border-neutral-800
        rounded-tl-2xl rounded-tr-2xl
        m-0 p-0
    ">
      <ThemeToggle />
    </div>
  );
}