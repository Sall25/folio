import "./sidebar-user.scss";

interface SidebarUserProps {
  name: string;
  avatarUrl?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Deterministic muted color from name — avoids the logo purple
function getAvatarColor(name: string): string {
  const colors = [
    { bg: "#2d3a2e", text: "#7dab82" }, // forest green
    { bg: "#2e2d3a", text: "#8b82c4" }, // slate blue
    { bg: "#3a2d2d", text: "#c48282" }, // muted red
    { bg: "#2d383a", text: "#82b8c4" }, // teal
    { bg: "#3a362d", text: "#c4b082" }, // amber
    { bg: "#382d3a", text: "#b882c4" }, // plum
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return (
    colors[Math.abs(hash) % colors.length].bg +
    "|" +
    colors[Math.abs(hash) % colors.length].text
  );
}

export function SidebarUser({ name, avatarUrl }: SidebarUserProps) {
  const initials = getInitials(name);
  const [bgColor, textColor] = getAvatarColor(name).split("|");

  return (
    <div className="sidebar-user">
      <span className="sidebar-user__initials">{initials}</span>
      <span className="sidebar-user__name">{name}</span>
    </div>
  );
}
