import "./logo.scss";

interface LogoProps {
  collapsed: boolean;
}

export function Logo({ collapsed }: LogoProps) {
  return (
    <div className="logo">
      <div className="logo__mark">
        <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect
            x="2"
            y="4"
            width="14"
            height="2.2"
            rx="1.1"
            fill="white"
            opacity="0.95"
          />
          <rect
            x="2"
            y="8.4"
            width="10"
            height="2.2"
            rx="1.1"
            fill="white"
            opacity="0.7"
          />
          <rect
            x="2"
            y="12.8"
            width="12"
            height="2.2"
            rx="1.1"
            fill="white"
            opacity="0.5"
          />
        </svg>
      </div>

      {!collapsed && (
        <div className="logo__wordmark">
          <span className="logo__name">Folio</span>
          <span className="logo__sub">Workspace</span>
        </div>
      )}
    </div>
  );
}
