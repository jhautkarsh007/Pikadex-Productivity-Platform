
import { useEffect, useState } from 'react'
import Notes from './Notes'
import Tasks from './Tasks'
import Analytics from './Analytics'
import Chat from './Chat'
import Calendar from './Calendar'
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

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

  // Set the application name shown in the browser tab.
  useEffect(() => {
    document.title = 'Pikadex | Productivity Platform'
  }, [])

  // Restore the existing login after a refresh.
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

  // Login through the existing Express backend.
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
        const currentUser = await fetchUser(result.accessToken)
        setUser(currentUser)
      } catch {
        setUser({ email: email.trim() })
      }
    } catch (err) {
      setError(err.message || 'Unable to log in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Logout through Express and clear the local session.
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

  // Session-loading screen.
  if (checkingSession) {
    return (
      <main className="screen">
        <p className="muted">Loading Pikadex...</p>
      </main>
    )
  }

  // Notes page.
  if (token && user && activePage === 'notes') {
    return (
      <main className="screen">
        <section className="dashboard">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigateTo('dashboard')}
          >
            ← Back to Dashboard
          </button>

          <Notes accessToken={token} />
        </section>
      </main>
    )
  }

  // Tasks and Timer page.
  if (token && user && activePage === 'tasks') {
    return (
      <main className="screen">
        <section className="dashboard">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigateTo('dashboard')}
          >
            ← Back to Dashboard
          </button>

          <Tasks accessToken={token} />
        </section>
      </main>
    )
  }

  // Analytics page.
  if (token && user && activePage === 'analytics') {
    return (
      <main className="screen">
        <section className="dashboard">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigateTo('dashboard')}
          >
            ← Back to Dashboard
          </button>

          <Analytics accessToken={token} />
        </section>
      </main>
    )
  }

  // Real-time chat page.
  if (token && user && activePage === 'chat') {
    return (
      <main className="screen">
        <section className="dashboard">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigateTo('dashboard')}
          >
            ← Back to Dashboard
          </button>

          <Chat user={user} />
        </section>
      </main>
    )
  }

  // Calendar page.
  if (token && user && activePage === 'calendar') {
    return (
      <main className="screen">
        <section className="dashboard calendar-dashboard">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigateTo('dashboard')}
          >
            ← Back to Dashboard
          </button>

          <Calendar user={user} />
        </section>
      </main>
    )
  }

  // Dashboard feature cards.
  if (token && user) {
    const features = [
      {
        id: 'notes',
        icon: '📝',
        title: 'Notes',
        description: 'Your personal notes, saved in MongoDB.',
        button: 'Open Notes',
      },
      {
        id: 'tasks',
        icon: '✅',
        title: 'Tasks',
        description: 'Organize projects and track your working time.',
        button: 'Open Task Manager',
      },
      {
        id: 'calendar',
        icon: '🗓️',
        title: 'Calendar',
        description: 'Plan events, deadlines, study sessions, and your schedule.',
        button: 'Open Calendar',
      },
      {
        id: 'analytics',
        icon: '📊',
        title: 'Analytics',
        description: 'Review your productivity and task progress.',
        button: 'Open Analytics',
      },
      {
        id: 'chat',
        icon: '💬',
        title: 'Real-time Chat',
        description: 'Send and receive messages instantly.',
        button: 'Open Chat',
      },
    ]

    return (
      <main className="screen">
        <section className="dashboard">
          <div className="brand-mark">P</div>

          <p className="eyebrow">
            PIKADEX PRODUCTIVITY PLATFORM
          </p>

          <h1>Welcome back!</h1>

          <p className="muted">
            Signed in as {user.name || user.email || email}
          </p>

          {error && <p className="error">{error}</p>}

          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature" key={feature.id}>
                <span>{feature.icon}</span>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>

                <button
                  type="button"
                  onClick={() => navigateTo(feature.id)}
                >
                  {feature.button}
                </button>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            Log out
          </button>

          <p className="muted footer-note">
            Pikadex · React · Express.js · MongoDB Atlas · Socket.IO
          </p>
        </section>
      </main>
    )
  }

  // Login page.
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
          Pikadex Productivity Platform
        </p>
      </section>
    </main>
  )
}
