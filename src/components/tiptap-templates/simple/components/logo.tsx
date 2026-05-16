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
            x="3"
            y="3"
            width="5.5"
            height="5.5"
            rx="1.2"
            fill="white"
            opacity="0.9"
          />
          <rect
            x="9.5"
            y="3"
            width="5.5"
            height="5.5"
            rx="1.2"
            fill="white"
            opacity="0.55"
          />
          <rect
            x="3"
            y="9.5"
            width="5.5"
            height="5.5"
            rx="1.2"
            fill="white"
            opacity="0.55"
          />
          <rect
            x="9.5"
            y="9.5"
            width="5.5"
            height="5.5"
            rx="1.2"
            fill="white"
            opacity="0.3"
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
