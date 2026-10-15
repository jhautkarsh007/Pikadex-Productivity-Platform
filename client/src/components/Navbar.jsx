
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'tasks', label: 'Tasks', icon: '✓' },
  { id: 'calendar', label: 'Calendar', icon: '▦' },
  { id: 'notes', label: 'Notes', icon: '▤' },
  { id: 'analytics', label: 'Analytics', icon: '↗' },
  { id: 'chat', label: 'Chat', icon: '☏' },
]

export default function Navbar({
  user,
  activePage,
  onNavigate,
  onLogout,
}) {
  const displayName =
    user?.name || user?.username || user?.email || 'User'

  return (
    <header className="app-navbar">
      <button
        type="button"
        className="navbar-brand"
        onClick={() => onNavigate('dashboard')}
        aria-label="Go to Pikadex dashboard"
      >
        <span className="navbar-logo">P</span>

        <span className="navbar-brand-text">
          <strong>Pikadex</strong>
          <small>Productivity Platform</small>
        </span>
      </button>

      <nav className="navbar-links" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`navbar-link ${
              activePage === item.id ? 'navbar-link-active' : ''
            }`}
            onClick={() => onNavigate(item.id)}
            aria-current={activePage === item.id ? 'page' : undefined}
          >
            <span className="navbar-link-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="navbar-account">
        <div className="navbar-user">
          <span className="navbar-avatar">
            {displayName.charAt(0).toUpperCase()}
          </span>

          <span className="navbar-user-name" title={displayName}>
            {displayName}
          </span>
        </div>

        <button
          type="button"
          className="navbar-logout"
          onClick={onLogout}
        >
          Log out
        </button>
      </div>
    </header>
  )
}
