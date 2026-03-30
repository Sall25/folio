// copy-toast.tsx
import "./copy-toast.scss";

interface CopyToastProps {
  visible: boolean;
}

export function CopyToast({ visible }: CopyToastProps) {
  return (
    <div className={`copy-toast ${visible ? "copy-toast--visible" : ""}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8l3.5 3.5L13 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Copied to clipboard
    </div>
  );
}
