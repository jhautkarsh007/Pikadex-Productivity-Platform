
import { useCallback, useEffect, useState } from 'react'

async function notesRequest(action, accessToken, fields = {}) {
  const formData = new FormData()
  formData.append('accessToken', accessToken)

  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, String(value))
  })

  const response = await fetch(`/api/notes/${action}`, {
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
    throw new Error(result?.message || `Request failed (${response.status}).`)
  }

  return result
}

export default function Notes({ accessToken }) {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadNotes = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await notesRequest('list', accessToken)
      setNotes(result.data || [])
    } catch (err) {
      setError(err.message || 'Unable to load notes.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  function resetForm() {
    setTitle('')
    setContent('')
    setEditingId(null)
  }

  function startEditing(note) {
    setEditingId(note._id)
    setTitle(note.title)
    setContent(note.content)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const action = editingId ? 'update' : 'create'

      const fields = editingId
        ? { noteId: editingId, title: title.trim(), content: content.trim() }
        : { title: title.trim(), content: content.trim() }

      const result = await notesRequest(action, accessToken, fields)

      setMessage(result.message || (editingId ? 'Note updated.' : 'Note created.'))
      resetForm()
      await loadNotes()
    } catch (err) {
      setError(err.message || 'Unable to save note.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(noteId) {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return
    }

    setError('')
    setMessage('')

    try {
      const result = await notesRequest('delete', accessToken, { noteId })

      if (editingId === noteId) {
        resetForm()
      }

      setMessage(result.message || 'Note deleted.')
      await loadNotes()
    } catch (err) {
      setError(err.message || 'Unable to delete note.')
    }
  }

  return (
    <section className="notes-page">
      <div className="notes-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
          <h1>My Notes</h1>
          <p className="muted">
            Capture ideas, save important information, and stay organized.
          </p>
        </div>

        <span className="notes-count">{notes.length} notes</span>
      </div>

      <form className="note-form" onSubmit={handleSave}>
        <h2>{editingId ? 'Edit note' : 'Create a note'}</h2>

        <label htmlFor="note-title">Title</label>
        <input
          id="note-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Give your note a title"
          maxLength={100}
          required
        />

        <label htmlFor="note-content">Content</label>
        <textarea
          id="note-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write your thoughts here..."
          maxLength={5000}
          rows={5}
          required
        />

        <div className="note-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create note'}
          </button>

          {editingId && (
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="notes-list-heading">
        <h2>Saved notes</h2>
        <button type="button" className="secondary-button" onClick={loadNotes}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading your notes...</p>
      ) : notes.length === 0 ? (
        <div className="empty-notes">
          <span>📝</span>
          <h3>No notes yet</h3>
          <p className="muted">Create your first note using the form above.</p>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <article className="note-card" key={note._id}>
              <h3>{note.title}</h3>

              <p className="note-content">{note.content}</p>

              <p className="note-date">
                Updated{' '}
                {note.updatedAt
                  ? new Date(note.updatedAt).toLocaleString()
                  : 'recently'}
              </p>

              <div className="note-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => startEditing(note)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="delete-button"
                  onClick={() => handleDelete(note._id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
