
import { useCallback, useEffect, useState } from 'react'
import './App.css'

async function loadAnalyticsData(accessToken) {
  const formData = new FormData()
  formData.append('accessToken', accessToken)

  const response = await fetch('/api/tasks/load', {
    method: 'POST',
    body: formData,
  })

  const raw = await response.text()
  let result

  try {
    result = raw ? JSON.parse(raw) : null
  } catch {
    throw new Error(`Invalid server response (HTTP ${response.status}).`)
  }

  if (!response.ok || result?.status !== 'success') {
    throw new Error(
      result?.message || `Unable to load analytics (HTTP ${response.status}).`
    )
  }

  return Array.isArray(result.data) ? result.data : []
}

function getLogEnd(log, task, now) {
  if (Number(log.endTime) > 0) {
    return Number(log.endTime)
  }

  return task.isStarted ? now : Number(log.startTime)
}

function getTaskDuration(task, now) {
  return (task.logs || []).reduce((total, log) => {
    const start = Number(log.startTime)
    const end = getLogEnd(log, task, now)

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return total
    }

    return total + Math.max(0, end - start)
  }, 0)
}

function getDurationForDay(task, dayStart, dayEnd, now) {
  return (task.logs || []).reduce((total, log) => {
    const start = Number(log.startTime)
    const end = getLogEnd(log, task, now)

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return total
    }

    // Count only the portion of a timer session inside this day.
    const overlapStart = Math.max(start, dayStart)
    const overlapEnd = Math.min(end, dayEnd)

    return total + Math.max(0, overlapEnd - overlapStart)
  }, 0)
}

function formatDuration(milliseconds) {
  const totalMinutes = Math.floor(
    Math.max(0, milliseconds) / 60000
  )

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`

  return `${hours}h ${minutes}m`
}

function buildAnalytics(projects, now) {
  const tasks = projects.flatMap((project) =>
    Array.isArray(project.tasks) ? project.tasks : []
  )

  const completedTasks = tasks.filter(
    (task) => task.status === 'Completed'
  ).length

  const inProgressTasks = tasks.filter(
    (task) => task.status !== 'Completed'
  ).length

  const totalTime = tasks.reduce(
    (total, task) => total + getTaskDuration(task, now),
    0
  )

  const completionRate = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0

  const today = new Date(now)
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime()

  const week = Array.from({ length: 7 }, (_, index) => {
    const dayStart = todayStart - (6 - index) * 24 * 60 * 60 * 1000
    const dayEnd = dayStart + 24 * 60 * 60 * 1000

    const focusTime = tasks.reduce(
      (total, task) =>
        total + getDurationForDay(task, dayStart, dayEnd, now),
      0
    )

    const date = new Date(dayStart)

    return {
      key: dayStart,
      label: date.toLocaleDateString(undefined, {
        weekday: 'short',
      }),
      dateLabel: date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      }),
      focusTime,
    }
  })

  return {
    projectCount: projects.length,
    totalTasks: tasks.length,
    completedTasks,
    inProgressTasks,
    completionRate,
    totalTime,
    week,
  }
}

export default function Analytics({ accessToken }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  const refreshAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await loadAnalyticsData(accessToken)
      setProjects(data)
      setNow(Date.now())
    } catch (err) {
      setError(err.message || 'Unable to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    refreshAnalytics()
  }, [refreshAnalytics])

  // Refresh the displayed duration of any currently running timer.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <section className="analytics-page">
        <p className="muted">Calculating your analytics...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="analytics-page">
        <p className="eyebrow">YOUR PRODUCTIVITY</p>
        <h1>Analytics</h1>
        <p className="error">{error}</p>

        <button type="button" onClick={refreshAnalytics}>
          Try Again
        </button>
      </section>
    )
  }

  const stats = buildAnalytics(projects, now)
  const maxFocus = Math.max(
    1,
    ...stats.week.map((day) => day.focusTime)
  )

  return (
    <section className="analytics-page">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">MEASURE YOUR PROGRESS</p>
          <h1>Analytics</h1>
          <p className="muted">
            Understand your task completion and time-tracking habits.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={refreshAnalytics}
        >
          Refresh Data
        </button>
      </div>

      <div className="analytics-summary">
        <article className="analytics-card">
          <span className="analytics-icon">📁</span>
          <p>Projects</p>
          <h2>{stats.projectCount}</h2>
          <span className="analytics-detail">Saved projects</span>
        </article>

        <article className="analytics-card">
          <span className="analytics-icon">✅</span>
          <p>Completed tasks</p>
          <h2>{stats.completedTasks}</h2>
          <span className="analytics-detail">
            Out of {stats.totalTasks} total
          </span>
        </article>

        <article className="analytics-card">
          <span className="analytics-icon">⏱️</span>
          <p>Time tracked</p>
          <h2>{formatDuration(stats.totalTime)}</h2>
          <span className="analytics-detail">Across saved timer logs</span>
        </article>

        <article className="analytics-card">
          <span className="analytics-icon">🎯</span>
          <p>Completion rate</p>
          <h2>{stats.completionRate}%</h2>
          <span className="analytics-detail">
            {stats.inProgressTasks} tasks remaining
          </span>
        </article>
      </div>

      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div>
            <h2>Daily focus time</h2>
            <p className="muted">
              Timer time recorded over the last seven days.
            </p>
          </div>

          <span className="chart-legend">
            <span className="legend-dot" />
            Focus time
          </span>
        </div>

        <div
          className="focus-chart"
          role="img"
          aria-label="Daily focus time over the last seven days"
        >
          {stats.week.map((day) => {
            const barHeight =
              day.focusTime === 0
                ? 0
                : Math.max(4, (day.focusTime / maxFocus) * 100)

            return (
              <div className="focus-day" key={day.key}>
                <span className="focus-value">
                  {formatDuration(day.focusTime)}
                </span>

                <div className="focus-bar-area">
                  <div
                    className={`focus-bar ${day.focusTime === 0 ? 'focus-bar-empty' : ''}`}
                    style={{ height: `${barHeight}%` }}
                    title={`${day.dateLabel}: ${formatDuration(day.focusTime)}`}
                  />
                </div>

                <span className="focus-day-name">{day.label}</span>
                <span className="focus-date">{day.dateLabel}</span>
              </div>
            )
          })}
        </div>

        <p className="chart-footnote">
          Days without recorded timer sessions show zero focus time.
        </p>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div>
            <h2>Task breakdown</h2>
            <p className="muted">
              Current status of your saved tasks.
            </p>
          </div>
        </div>

        <div className="task-breakdown">
          <div className="breakdown-row">
            <div className="breakdown-label">
              <span>Completed</span>
              <strong>{stats.completedTasks}</strong>
            </div>

            <div className="breakdown-track">
              <div
                className="breakdown-fill breakdown-completed"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          <div className="breakdown-row">
            <div className="breakdown-label">
              <span>In progress</span>
              <strong>{stats.inProgressTasks}</strong>
            </div>

            <div className="breakdown-track">
              <div
                className="breakdown-fill breakdown-progress"
                style={{
                  width: `${
                    stats.totalTasks
                      ? (stats.inProgressTasks / stats.totalTasks) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {stats.totalTasks === 0 && (
        <p className="muted analytics-empty">
          Create projects and tasks in Task Manager to populate your analytics.
        </p>
      )}
    </section>
  )
}
