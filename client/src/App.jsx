
import { useEffect, useState } from 'react'
import Notes from './Notes'
import Tasks from './Tasks'
import Analytics from './Analytics'
import Chat from './Chat'
import './App.css'

async function readJsonResponse(response) {
  const rawResponse = await response.text()

  if (!rawResponse) {
    throw new Error(
      `The server returned an empty response (HTTP ${response.status}).`
    )
  }

  try {
    return JSON.parse(rawResponse)
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

  // Restore the existing session after a page refresh.
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
          setActivePage('dashboard')
          setError('')
        }
      } catch {
        if (active) {
          // Keep the saved token if the backend is temporarily unavailable.
          // Clear it when the server responds that the session is invalid.
          try {
            const retryUser = await fetchUser(savedToken)

            if (active) {
              setToken(savedToken)
              setUser(retryUser)
            }
          } catch (retryError) {
            if (!(retryError instanceof TypeError)) {
              localStorage.removeItem('accessToken')
            } else {
              setError(
                'Cannot connect to Pikadex. Check that the backend is running.'
              )
            }
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
        // Login succeeded. The profile can be retried after refresh.
        setUser({ email: email.trim() })
      }
    } catch (err) {
      setError(err.message || 'Unable to log in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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

  if (checkingSession) {
    return (
      <main className="screen">
        <p className="muted">Checking your session...</p>
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
            onClick={() => {
              setError('')
              setActivePage('dashboard')
            }}
          >
            ← Back to Dashboard
          </button>

          <Notes accessToken={token} />
        </section>
      </main>
    )
  }

  // Task Manager and Timer page.
  if (token && user && activePage === 'tasks') {
    return (
      <main className="screen">
        <section className="dashboard">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setError('')
              setActivePage('dashboard')
            }}
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
            onClick={() => {
              setError('')
              setActivePage('dashboard')
            }}
          >
            ← Back to Dashboard
          </button>

          <Analytics accessToken={token} />
        </section>
      </main>
    )
  }

  // Real-time Socket.IO chat page.
  if (token && user && activePage === 'chat') {
    return (
      <main className="screen">
        <section className="dashboard">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setError('')
              setActivePage('dashboard')
            }}
          >
            ← Back to Dashboard
          </button>

          <Chat user={user} />
        </section>
      </main>
    )
  }

  // Main dashboard.
  if (token && user) {
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
            <article className="feature">
              <span>📝</span>
              <h2>Notes</h2>
              <p>Your personal notes, saved in MongoDB.</p>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setActivePage('notes')
                }}
              >
                Open Notes
              </button>
            </article>

            <article className="feature">
              <span>✅</span>
              <h2>Tasks</h2>
              <p>Organize projects and track your working time.</p>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setActivePage('tasks')
                }}
              >
                Open Task Manager
              </button>
            </article>

            <article className="feature">
              <span>📊</span>
              <h2>Analytics</h2>
              <p>Review your productivity and task progress.</p>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setActivePage('analytics')
                }}
              >
                Open Analytics
              </button>
            </article>

            <article className="feature">
              <span>💬</span>
              <h2>Real-time Chat</h2>
              <p>Send and receive messages instantly.</p>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setActivePage('chat')
                }}
              >
                Open Chat
              </button>
            </article>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            Log out
          </button>

          <p className="muted footer-note">
            React · Express.js · MongoDB Atlas · Socket.IO
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
          Powered by React, Express.js and MongoDB
        </p>
      </section>
    </main>
  )
}
