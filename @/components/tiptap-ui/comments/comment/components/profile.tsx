import './profile.scss'

export function Profile({ src = 'https://img.freepik.com/premium-photo/cartoon-game-avatar-logo-gaming-brand_902820-465.jpg' }: { src?: string }) {
  return (
    <img
      className="profile-pic"
      src={src}
      alt="pic"
    />
  )
}