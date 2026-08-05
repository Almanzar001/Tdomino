function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function PlayerAvatar({
  name,
  url,
  size = 32,
}: {
  name: string
  url: string | null
  size?: number
}) {
  const style = { width: size, height: size, fontSize: size * 0.4 }

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="player-avatar"
        style={style}
        width={size}
        height={size}
      />
    )
  }

  return (
    <span className="player-avatar player-avatar-fallback" style={style}>
      {initials(name) || '?'}
    </span>
  )
}
