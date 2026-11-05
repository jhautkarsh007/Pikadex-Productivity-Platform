
import { useEffect, useState } from 'react'
import Notes from './Notes'
import Tasks from './Tasks'
import Analytics from './Analytics'
import Chat from './Chat'
import Calendar from './Calendar'
import Navbar from './components/Navbar'
import FeatureCard from './components/FeatureCard'
import './App.css'
import './AppAuth.css'
import './AppTheme.css'

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
  const [authPage, setAuthPage] = useState('login')
  const [notice, setNotice] = useState('')
  const [signupForm, setSignupForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: 'Male',
  })

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

  // Register a new account using the existing Express /signup endpoint.
  async function handleSignup(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('name', signupForm.name.trim())
      formData.append('username', signupForm.username.trim())
      formData.append('email', signupForm.email.trim())
      formData.append('password', signupForm.password)
      formData.append('gender', signupForm.gender)

      const response = await fetch('/signup', {
        method: 'POST',
        body: formData,
      })

      const result = await readJsonResponse(response)

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Unable to create your account.')
      }

      const registeredEmail = signupForm.email.trim()
      setSignupForm({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        gender: 'Male',
      })
      setEmail(registeredEmail)
      setPassword('')
      setAuthPage('login')
      setNotice(result.message || 'Account created successfully. You can sign in now.')
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.')
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

  // React authentication screens: login and signup.
  if (!token || !user) {
    const isSignup = authPage === 'signup'

    return (
      <main className={`screen auth-screen${isSignup ? ' auth-screen-signup' : ''}`}>
        <div className="auth-orb auth-orb-one" aria-hidden="true" />
        <div className="auth-orb auth-orb-two" aria-hidden="true" />

        <div className="auth-layout">
          <aside className="auth-showcase">
            <div className="auth-brand-lockup">
              <div className="brand-mark">P</div>
              <span className="auth-brand-name">pikadex<span>.</span></span>
              <span className="auth-brand-label">YOUR WORKSPACE</span>
            </div>

            <div className="auth-showcase-copy">
              <p className="auth-kicker"><span /> FOCUS ON WHAT MATTERS</p>
              <h2>Make space for<br /><em>great work.</em></h2>
              <p className="auth-showcase-description">
                A calmer way to plan your day, capture ideas, and make meaningful progress.
              </p>

              <div className="auth-benefits">
                <div className="auth-benefit">
                  <span className="auth-benefit-icon">✦</span>
                  <span><strong>Find your focus</strong><small>Keep every priority in view.</small></span>
                </div>
                <div className="auth-benefit">
                  <span className="auth-benefit-icon">▦</span>
                  <span><strong>Bring it together</strong><small>Tasks, notes, and plans in one place.</small></span>
                </div>
                <div className="auth-benefit">
                  <span className="auth-benefit-icon">↗</span>
                  <span><strong>See your progress</strong><small>Turn small steps into momentum.</small></span>
                </div>
              </div>
            </div>

            <div className="auth-showcase-bottom">
              <div className="auth-avatar-stack" aria-hidden="true">
                <span>U</span><span>P</span><span>+</span>
              </div>
              <p>Build better days, one task at a time.</p>
            </div>
          </aside>

          <section className={`login-card auth-card${isSignup ? ' signup-card' : ''}`}>
            <div className="auth-card-header">
              <span className="auth-form-label">{isSignup ? 'GET STARTED' : 'WELCOME BACK'}</span>
              <span className="auth-secure-label"><span /> SECURE WORKSPACE</span>
            </div>

            <p className="eyebrow">{isSignup ? 'YOUR NEXT CHAPTER STARTS HERE' : 'YOUR PERSONAL WORKSPACE'}</p>
            <h1>{isSignup ? 'Create your account' : 'Welcome back.'}</h1>
            <p className="muted auth-intro">
              {isSignup
                ? 'Set up your space and make every day a little more intentional.'
                : 'Sign in and pick up right where your best work begins.'}
            </p>

            {notice && !isSignup && (
              <p className="success-message" role="status">{notice}</p>
            )}

            {isSignup ? (
              <form className="auth-form signup-form" onSubmit={handleSignup}>
                <div className="auth-field">
                  <label htmlFor="signup-name">Full name</label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    value={signupForm.name}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-username">Username</label>
                  <input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    placeholder="Choose a username"
                    value={signupForm.username}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, username: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="auth-field auth-field-wide">
                  <label htmlFor="signup-email">Email address</label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signupForm.email}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    minLength={6}
                    value={signupForm.password}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, password: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-confirm-password">Confirm password</label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    minLength={6}
                    value={signupForm.confirmPassword}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="auth-field auth-field-wide">
                  <label htmlFor="signup-gender">Gender</label>
                  <select
                    id="signup-gender"
                    value={signupForm.gender}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, gender: event.target.value }))
                    }
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {error && <p className="error auth-form-message" role="alert">{error}</p>}

                <button className="auth-submit auth-field-wide" type="submit" disabled={loading}>
                  {loading ? 'Creating your space...' : 'Create account'}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleLogin}>
                <div className="auth-field">
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
                </div>

                <div className="auth-field">
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
                </div>

                {error && <p className="error auth-form-message" role="alert">{error}</p>}

                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? 'Signing you in...' : 'Sign in'}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            )}

            <div className="auth-switch">
              <span>{isSignup ? 'Already have an account?' : 'New to Pikadex?'}</span>
              <a
                href={isSignup ? '/login' : '/signup'}
                onClick={(event) => {
                  event.preventDefault()
                  setError('')
                  setNotice('')
                  setAuthPage(isSignup ? 'login' : 'signup')
                }}
              >
                {isSignup ? 'Sign in' : 'Create an account'}
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <p className="auth-legal">By continuing, you agree to use Pikadex responsibly.</p>
          </section>
        </div>
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
