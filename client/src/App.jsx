
import { useEffect, useState } from 'react'
import Notes from './Notes'
import Tasks from './Tasks'
import Analytics from './Analytics'
import Chat from './Chat'
import Calendar from './Calendar'
import Navbar from './components/Navbar'
import FeatureCard from './components/FeatureCard'
import './App.css'

async function readJsonResponse(response) {
  const raw = await response.text()

  if (!raw) {
    throw new Error(
      `The server returned an empty response (HTTP ${response.status}).`
    )
  }

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(
      `The server returned an invalid response (HTTP ${response.status}).`
    )
  }
}

async function fetchUser(accessToken) {
  const formData = new FormData()
  formData.append('accessToken', accessToken)

  const response = await fetch('/getUser', {
    method: 'POST',
    body: formData,
  })

  const result = await readJsonResponse(response)

  if (!response.ok || result.status !== 'success') {
    throw new Error(result.message || 'Unable to load your account.')
  }

  return result.data
}

const FEATURES = [
  {
    id: 'tasks',
    icon: '✓',
    title: 'Task Manager',
    description:
      'Organize projects, manage tasks, and track time spent working.',
    buttonLabel: 'Open tasks',
    accent: 'green',
  },
  {
    id: 'calendar',
    icon: '▦',
    title: 'Calendar',
    description:
      'Plan study sessions, deadlines, meetings, and personal events.',
    buttonLabel: 'Open calendar',
    accent: 'purple',
  },
  {
    id: 'notes',
    icon: '▤',
    title: 'Notes',
    description:
      'Capture ideas and keep important information organized.',
    buttonLabel: 'Open notes',
    accent: 'blue',
  },
  {
    id: 'analytics',
    icon: '↗',
    title: 'Analytics',
    description:
      'Review task completion and understand your tracked focus time.',
    buttonLabel: 'View analytics',
    accent: 'orange',
  },
  {
    id: 'chat',
    icon: '☏',
    title: 'Real-time Chat',
    description:
      'Communicate instantly with authenticated users.',
    buttonLabel: 'Open chat',
    accent: 'pink',
  },
]

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

  useEffect(() => {
    document.title = 'Pikadex | Productivity Platform'
  }, [])

  // Restore the saved session.
  useEffect(() => {
    let active = true

    async function restoreSession() {
      const savedToken = localStorage.getItem('accessToken')

      if (!savedToken) {
        if (active) setCheckingSession(false)
        return
      }

      try {
        const currentUser = await fetchUser(savedToken)

        if (active) {
          setToken(savedToken)
          setUser(currentUser)
          setError('')
        }
      } catch (err) {
        if (active) {
          if (err instanceof TypeError) {
            setError(
              'Cannot connect to Pikadex. Check that the backend is running.'
            )
          } else {
            localStorage.removeItem('accessToken')
          }
        }
      } finally {
        if (active) setCheckingSession(false)
      }
    }

    restoreSession()

    return () => {
      active = false
    }
  }, [])

  // Sign in using the existing Express endpoint.
  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('email', email.trim())
      formData.append('password', password)

      const response = await fetch('/login', {
        method: 'POST',
        body: formData,
      })

      const result = await readJsonResponse(response)

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Login failed.')
      }

      if (!result.accessToken) {
        throw new Error('The server did not return an access token.')
      }

      localStorage.setItem('accessToken', result.accessToken)
      setToken(result.accessToken)
      setActivePage('dashboard')
      setPassword('')

      try {
        setUser(await fetchUser(result.accessToken))
      } catch {
        setUser({ email: email.trim() })
      }
    } catch (err) {
      setError(err.message || 'Unable to log in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Sign out and clear the local session.
  async function handleLogout() {
    const currentToken = token
    let logoutError = ''

    setError('')

    try {
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      const result = await readJsonResponse(response)

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Server logout failed.')
      }
    } catch (err) {
      logoutError =
        err.message || 'The server could not confirm the logout.'
    } finally {
      localStorage.removeItem('accessToken')
      setToken('')
      setUser(null)
      setEmail('')
      setPassword('')
      setActivePage('dashboard')
    }

    if (logoutError) {
      setError(
        `Signed out locally, but server logout could not be confirmed: ${logoutError}`
      )
    }
  }

  function navigateTo(page) {
    setError('')
    setActivePage(page)
  }

  if (checkingSession) {
    return (
      <main className="screen">
        <p className="muted">Loading Pikadex...</p>
      </main>
    )
  }

  // Login screen.
  if (!token || !user) {
    return (
      <main className="screen">
        <section className="login-card">
          <div className="brand-mark">P</div>

          <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
          <h1>Welcome to Pikadex</h1>

          <p className="muted">
            Sign in to organize your work and stay productive.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="muted footer-note">
            Pikadex · Productivity Platform
          </p>
        </section>
      </main>
    )
  }

  // Main authenticated application.
  return (
    <main className="screen app-screen">
      <section className="dashboard app-shell">
        <Navbar
          user={user}
          activePage={activePage}
          onNavigate={navigateTo}
          onLogout={handleLogout}
        />

        <div className="app-page-content">
          {error && <p className="error">{error}</p>}

          {activePage === 'dashboard' && (
            <section className="dashboard-home">
              <div className="dashboard-welcome">
                <div>
                  <p className="eyebrow">
                    YOUR PRODUCTIVITY WORKSPACE
                  </p>

                  <h1>
                    Welcome back,{' '}
                    {(user.name || user.username || 'there').split(' ')[0]}!
                  </h1>

                  <p className="muted">
                    Bring your plans, tasks, and ideas together.
                  </p>
                </div>

                <div className="dashboard-date">
                  <span className="dashboard-date-icon">▦</span>

                  <span>
                    <strong>
                      {new Date().toLocaleDateString(undefined, {
                        weekday: 'long',
                      })}
                    </strong>

                    <small>
                      {new Date().toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </small>
                  </span>
                </div>
              </div>

              <div className="section-heading">
                <div>
                  <h2>Your workspace</h2>
                  <p className="muted">
                    Choose a tool to continue your work.
                  </p>
                </div>

                <span className="workspace-count">
                  {FEATURES.length} tools
                </span>
              </div>

              <div className="feature-grid feature-grid-modern">
                {FEATURES.map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    {...feature}
                    onClick={() => navigateTo(feature.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {activePage === 'notes' && (
            <Notes accessToken={token} />
          )}

          {activePage === 'tasks' && (
            <Tasks accessToken={token} />
          )}

          {activePage === 'calendar' && (
            <Calendar user={user} accessToken={token} />
          )}

          {activePage === 'analytics' && (
            <Analytics accessToken={token} />
          )}

          {activePage === 'chat' && (
            <Chat user={user} accessToken={token} />
          )}
        </div>

        <footer className="app-footer">
          <span>
            <span className="footer-brand-dot">P</span>
            Pikadex
          </span>

          <span>Productivity, organized.</span>
        </footer>
      </section>
    </main>
  )
}
