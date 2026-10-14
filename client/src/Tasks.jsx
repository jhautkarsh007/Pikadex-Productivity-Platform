
import { useCallback, useEffect, useState } from 'react'
import './App.css'

async function taskRequest(action, accessToken, projects) {
  const formData = new FormData()
  formData.append('accessToken', accessToken)

  if (projects !== undefined) {
    formData.append('projects', JSON.stringify(projects))
  }

  const response = await fetch(`/api/tasks/${action}`, {
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
      result?.message || `Task request failed (HTTP ${response.status}).`
    )
  }

  return result
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

function getElapsed(task, now) {
  return (task.logs || []).reduce((total, log) => {
    const end = log.endTime || (task.isStarted ? now : log.startTime)
    return total + Math.max(0, end - log.startTime)
  }, 0)
}

function createTask(id, name) {
  return {
    id,
    name,
    status: 'Progress',
    isStarted: false,
    logs: [],
    started: '',
    ended: '',
  }
}

export default function Tasks({ accessToken }) {
  const [projects, setProjects] = useState([])
  const [projectName, setProjectName] = useState('')
  const [taskNames, setTaskNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await taskRequest('load', accessToken)
      setProjects(Array.isArray(result.data) ? result.data : [])
    } catch (err) {
      setError(err.message || 'Unable to load your tasks.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  async function persistProjects(nextProjects) {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const result = await taskRequest('save', accessToken, nextProjects)
      setProjects(nextProjects)
      setMessage(result.message || 'Changes saved.')
      return true
    } catch (err) {
      setError(err.message || 'Could not save your changes.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function addProject(event) {
    event.preventDefault()

    const name = projectName.trim()
    if (!name || saving) return

    const nextId =
      Math.max(0, ...projects.map((project) => Number(project.id) || 0)) + 1

    const nextProjects = [
      ...projects,
      { id: nextId, name, tasks: [] },
    ]

    const saved = await persistProjects(nextProjects)

    if (saved) setProjectName('')
  }

  async function addTask(event, project) {
    event.preventDefault()

    const name = (taskNames[project.id] || '').trim()
    if (!name || saving) return

    const nextTaskId =
      Math.max(0, ...(project.tasks || []).map((task) => Number(task.id) || 0)) + 1

    const nextProjects = projects.map((item) =>
      item.id === project.id
        ? {
            ...item,
            tasks: [...(item.tasks || []), createTask(nextTaskId, name)],
          }
        : item
    )

    const saved = await persistProjects(nextProjects)

    if (saved) {
      setTaskNames((current) => ({ ...current, [project.id]: '' }))
    }
  }

  async function startOrStopTimer(projectId, taskId) {
    if (saving) return

    const timestamp = Date.now()
    const timeLabel = new Date(timestamp).toLocaleString()

    const nextProjects = projects.map((project) => {
      if (project.id !== projectId) return project

      return {
        ...project,
        tasks: project.tasks.map((task) => {
          if (task.id !== taskId) return task

          if (task.isStarted) {
            const logs = [...(task.logs || [])]
            const lastIndex = logs.length - 1

            if (lastIndex >= 0 && !logs[lastIndex].endTime) {
              logs[lastIndex] = {
                ...logs[lastIndex],
                endTime: timestamp,
              }
            }

            return {
              ...task,
              isStarted: false,
              ended: timeLabel,
              logs,
            }
          }

          const nextLogId =
            Math.max(0, ...(task.logs || []).map((log) => Number(log.id) || 0)) + 1

          return {
            ...task,
            status: 'Progress',
            isStarted: true,
            started: timeLabel,
            ended: '',
            logs: [
              ...(task.logs || []),
              {
                id: nextLogId,
                startTime: timestamp,
                endTime: 0,
              },
            ],
          }
        }),
      }
    })

    await persistProjects(nextProjects)
  }

  async function toggleCompleted(projectId, taskId) {
    if (saving) return

    const timestamp = Date.now()
    const timeLabel = new Date(timestamp).toLocaleString()

    const nextProjects = projects.map((project) => {
      if (project.id !== projectId) return project

      return {
        ...project,
        tasks: project.tasks.map((task) => {
          if (task.id !== taskId) return task

          const completing = task.status !== 'Completed'
          let logs = [...(task.logs || [])]

          if (completing && task.isStarted && logs.length > 0) {
            const lastIndex = logs.length - 1

            if (!logs[lastIndex].endTime) {
              logs[lastIndex] = {
                ...logs[lastIndex],
                endTime: timestamp,
              }
            }
          }

          return {
            ...task,
            status: completing ? 'Completed' : 'Progress',
            isStarted: false,
            logs,
            ended: completing ? timeLabel : '',
          }
        }),
      }
    })

    await persistProjects(nextProjects)
  }

  async function deleteTask(projectId, taskId) {
    if (saving) return
    if (!window.confirm('Delete this task?')) return

    const nextProjects = projects.map((project) =>
      project.id === projectId
        ? {
            ...project,
            tasks: project.tasks.filter((task) => task.id !== taskId),
          }
        : project
    )

    await persistProjects(nextProjects)
  }

  async function deleteProject(projectId) {
    if (saving) return

    if (!window.confirm('Delete this project and all its tasks?')) return

    const nextProjects = projects.filter(
      (project) => project.id !== projectId
    )

    await persistProjects(nextProjects)
  }

  const totalTasks = projects.reduce(
    (total, project) => total + (project.tasks || []).length,
    0
  )

  const completedTasks = projects.reduce(
    (total, project) =>
      total +
      (project.tasks || []).filter((task) => task.status === 'Completed').length,
    0
  )

  return (
    <section className="tasks-page">
      <div className="tasks-heading">
        <div>
          <p className="eyebrow">PLAN · FOCUS · COMPLETE</p>
          <h1>Task Manager</h1>
          <p className="muted">
            Organize projects, manage tasks, and track your working time.
          </p>
        </div>

        <div className="task-stats">
          <span>{projects.length} projects</span>
          <span>{completedTasks}/{totalTasks} completed</span>
        </div>
      </div>

      <form className="project-form" onSubmit={addProject}>
        <label htmlFor="project-name">Create a project</label>

        <div className="task-input-row">
          <input
            id="project-name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="e.g. Interview preparation"
            maxLength={100}
            required
          />

          <button type="submit" disabled={saving}>
            Add Project
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {saving && <p className="muted">Saving changes...</p>}

      {loading ? (
        <p className="muted">Loading your projects...</p>
      ) : projects.length === 0 ? (
        <div className="empty-notes">
          <span>✅</span>
          <h3>No projects yet</h3>
          <p className="muted">Create your first project above.</p>
        </div>
      ) : (
        <div className="projects-list">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-title-row">
                <div>
                  <p className="eyebrow">PROJECT</p>
                  <h2>{project.name}</h2>
                  <p className="muted">
                    {(project.tasks || []).length} tasks
                  </p>
                </div>

                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteProject(project.id)}
                  disabled={saving}
                >
                  Delete Project
                </button>
              </div>

              <form
                className="add-task-form"
                onSubmit={(event) => addTask(event, project)}
              >
                <input
                  aria-label={`New task for ${project.name}`}
                  value={taskNames[project.id] || ''}
                  onChange={(event) =>
                    setTaskNames((current) => ({
                      ...current,
                      [project.id]: event.target.value,
                    }))
                  }
                  placeholder="Add a task..."
                  maxLength={200}
                  required
                />

                <button type="submit" disabled={saving}>
                  Add Task
                </button>
              </form>

              {(project.tasks || []).length === 0 ? (
                <p className="muted">No tasks in this project yet.</p>
              ) : (
                <div className="tasks-list">
                  {project.tasks.map((task) => (
                    <div className="task-item" key={task.id}>
                      <div className="task-main">
                        <span
                          className={
                            task.status === 'Completed'
                              ? 'task-status completed'
                              : 'task-status'
                          }
                        >
                          {task.status === 'Completed'
                            ? 'Completed'
                            : 'In progress'}
                        </span>

                        <h3>{task.name}</h3>

                        <p className="task-timer">
                          ⏱ {formatDuration(getElapsed(task, now))}
                          {task.isStarted && (
                            <span className="timer-running"> · Timer running</span>
                          )}
                        </p>
                      </div>

                      <div className="task-actions">
                        {task.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() =>
                              startOrStopTimer(project.id, task.id)
                            }
                            disabled={saving}
                          >
                            {task.isStarted ? 'Stop Timer' : 'Start Timer'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            toggleCompleted(project.id, task.id)
                          }
                          disabled={saving}
                        >
                          {task.status === 'Completed'
                            ? 'Reopen'
                            : 'Complete'}
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => deleteTask(project.id, task.id)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="task-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={loadProjects}
          disabled={saving || loading}
        >
          Refresh Projects
        </button>
      </div>
    </section>
  )
}
