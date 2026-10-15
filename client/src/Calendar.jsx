
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const CATEGORIES = ['Work', 'Personal', 'Study', 'Health', 'Other']

const CATEGORY_STYLES = {
  Work: 'calendar-event-work',
  Personal: 'calendar-event-personal',
  Study: 'calendar-event-study',
  Health: 'calendar-event-health',
  Other: 'calendar-event-other',
}

function toLocalDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getInitialEvents(storageKey) {
  try {
    const saved = localStorage.getItem(storageKey)
    const parsed = saved ? JSON.parse(saved) : []

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatLongDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`)

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`)

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

function getMonthLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date)

    if (dateOrder !== 0) return dateOrder

    return (a.time || '23:59').localeCompare(b.time || '23:59')
  })
}

export default function Calendar({ user }) {
  const userKey = user?._id || user?.email || user?.username || 'guest'
  const storageKey = `pikadex-calendar-${userKey}`

  const today = toLocalDateString(new Date())

  const [events, setEvents] = useState(() =>
    getInitialEvents(storageKey)
  )

  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState(today)
  const [showEventForm, setShowEventForm] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    title: '',
    date: today,
    time: '09:00',
    category: 'Work',
    description: '',
  })

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setEvents(getInitialEvents(storageKey))
  }, [storageKey])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(events))
    } catch {
      setError('Unable to save calendar events in this browser.')
    }
  }, [events, storageKey])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    )

    // Monday-first calendar.
    const mondayOffset = (firstDay.getDay() + 6) % 7

    const gridStart = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      1 - mondayOffset
    )

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)

      return {
        date,
        dateString: toLocalDateString(date),
        inCurrentMonth:
          date.getMonth() === currentMonth.getMonth(),
      }
    })
  }, [currentMonth])

  const sortedEvents = useMemo(
    () => sortEvents(events),
    [events]
  )

  const selectedEvents = useMemo(
    () => sortedEvents.filter((event) => event.date === selectedDate),
    [sortedEvents, selectedDate]
  )

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return selectedEvents.filter((event) => {
      const matchesSearch =
        !query ||
        event.title.toLowerCase().includes(query) ||
        (event.description || '').toLowerCase().includes(query)

      const matchesCategory =
        categoryFilter === 'All' ||
        event.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [selectedEvents, search, categoryFilter])

  const upcomingEvents = useMemo(() => {
    return sortedEvents
      .filter((event) => event.date >= today)
      .slice(0, 4)
  }, [sortedEvents, today])

  function moveMonth(amount) {
    setCurrentMonth((current) =>
      new Date(
        current.getFullYear(),
        current.getMonth() + amount,
        1
      )
    )
  }

  function goToToday() {
    const now = new Date()

    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    )
    setSelectedDate(toLocalDateString(now))
  }

  function openNewEvent(dateString = selectedDate) {
    setEditingId(null)
    setError('')
    setMessage('')

    setForm({
      title: '',
      date: dateString,
      time: '09:00',
      category: 'Work',
      description: '',
    })

    setShowEventForm(true)
  }

  function openEditEvent(event) {
    setEditingId(event.id)
    setError('')
    setMessage('')

    setForm({
      title: event.title,
      date: event.date,
      time: event.time || '',
      category: event.category || 'Other',
      description: event.description || '',
    })

    setShowEventForm(true)
  }

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleSaveEvent(event) {
    event.preventDefault()

    const title = form.title.trim()
    const description = form.description.trim()

    if (!title) {
      setError('Please enter an event title.')
      return
    }

    if (!form.date) {
      setError('Please choose a date.')
      return
    }

    if (
      !CATEGORIES.includes(form.category) ||
      title.length > 100 ||
      description.length > 500
    ) {
      setError('Please check the event details and try again.')
      return
    }

    if (editingId) {
      setEvents((current) =>
        current.map((item) =>
          item.id === editingId
            ? { ...item, ...form, title, description }
            : item
        )
      )

      setMessage('Event updated.')
    } else {
      const newEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title,
        date: form.date,
        time: form.time,
        category: form.category,
        description,
      }

      setEvents((current) => [...current, newEvent])
      setMessage('Event added to your calendar.')
    }

    setSelectedDate(form.date)

    const savedDate = new Date(`${form.date}T12:00:00`)

    setCurrentMonth(
      new Date(savedDate.getFullYear(), savedDate.getMonth(), 1)
    )

    setShowEventForm(false)
    setEditingId(null)
    setError('')
  }

  function handleDeleteEvent(eventId) {
    const confirmed = window.confirm(
      'Delete this calendar event?'
    )

    if (!confirmed) return

    setEvents((current) =>
      current.filter((event) => event.id !== eventId)
    )

    if (editingId === eventId) {
      setEditingId(null)
      setShowEventForm(false)
    }

    setMessage('Event deleted.')
    setError('')
  }

  return (
    <section className="calendar-page">
      <header className="calendar-header">
        <div>
          <p className="eyebrow">PLAN YOUR DAYS</p>
          <h1>Calendar</h1>
          <p className="muted">
            Keep deadlines, study sessions, and important events in one place.
          </p>
        </div>

        <button
          type="button"
          className="calendar-primary-button"
          onClick={() => openNewEvent()}
        >
          <span aria-hidden="true">＋</span> New event
        </button>
      </header>

      <div className="calendar-toolbar">
        <div className="calendar-month-navigation">
          <button
            type="button"
            className="calendar-icon-button"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>

          <h2>{getMonthLabel(currentMonth)}</h2>

          <button
            type="button"
            className="calendar-icon-button"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <button
          type="button"
          className="calendar-today-button"
          onClick={goToToday}
        >
          Today
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="calendar-workspace">
        <div className="calendar-board">
          <div className="calendar-weekdays">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
              (day) => (
                <div key={day}>{day}</div>
              )
            )}
          </div>

          <div className="calendar-grid">
            {calendarDays.map(({ date, dateString, inCurrentMonth }) => {
              const dayEvents = sortedEvents.filter(
                (event) => event.date === dateString
              )

              const isToday = dateString === today
              const isSelected = dateString === selectedDate

              return (
                <button
                  type="button"
                  key={dateString}
                  className={[
                    'calendar-day',
                    !inCurrentMonth ? 'calendar-day-outside' : '',
                    isToday ? 'calendar-day-today' : '',
                    isSelected ? 'calendar-day-selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    setSelectedDate(dateString)
                    setMessage('')
                    setError('')
                    setShowEventForm(false)
                  }}
                  aria-label={`${formatLongDate(dateString)}, ${dayEvents.length} events`}
                  aria-pressed={isSelected}
                >
                  <span className="calendar-day-number">
                    {date.getDate()}
                  </span>

                  <div className="calendar-day-events">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span
                        key={event.id}
                        className={[
                          'calendar-event-chip',
                          CATEGORY_STYLES[event.category] ||
                            CATEGORY_STYLES.Other,
                        ].join(' ')}
                        title={event.title}
                      >
                        {event.title}
                      </span>
                    ))}

                    {dayEvents.length > 2 && (
                      <span className="calendar-more-events">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="calendar-legend">
            {CATEGORIES.map((category) => (
              <span className="calendar-legend-item" key={category}>
                <span
                  className={[
                    'calendar-legend-dot',
                    CATEGORY_STYLES[category],
                  ].join(' ')}
                />
                {category}
              </span>
            ))}
          </div>
        </div>

        <aside className="calendar-sidebar">
          {showEventForm ? (
            <div className="calendar-event-form-panel">
              <div className="calendar-sidebar-heading">
                <div>
                  <p className="eyebrow">
                    {editingId ? 'UPDATE EVENT' : 'MAKE A PLAN'}
                  </p>
                  <h2>{editingId ? 'Edit event' : 'New event'}</h2>
                </div>

                <button
                  type="button"
                  className="calendar-close-button"
                  onClick={() => {
                    setShowEventForm(false)
                    setEditingId(null)
                    setError('')
                  }}
                  aria-label="Close event form"
                >
                  ×
                </button>
              </div>

              <form
                className="calendar-event-form"
                onSubmit={handleSaveEvent}
              >
                <label htmlFor="calendar-event-title">
                  Event title
                </label>

                <input
                  id="calendar-event-title"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. DSA practice"
                  maxLength={100}
                  required
                />

                <label htmlFor="calendar-event-date">Date</label>

                <input
                  id="calendar-event-date"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />

                <label htmlFor="calendar-event-time">Time</label>

                <input
                  id="calendar-event-time"
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleFormChange}
                />

                <label htmlFor="calendar-event-category">
                  Category
                </label>

                <select
                  id="calendar-event-category"
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <label htmlFor="calendar-event-description">
                  Description <span className="calendar-optional">(optional)</span>
                </label>

                <textarea
                  id="calendar-event-description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Add a few details..."
                  maxLength={500}
                  rows={3}
                />

                {error && <p className="error">{error}</p>}

                <button
                  type="submit"
                  className="calendar-primary-button calendar-save-button"
                >
                  {editingId ? 'Save changes' : 'Create event'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="calendar-sidebar-heading">
                <div>
                  <p className="eyebrow">YOUR SCHEDULE</p>
                  <h2>Day agenda</h2>
                </div>

                <button
                  type="button"
                  className="calendar-add-small"
                  aria-label="Add event for selected date"
                  onClick={() => openNewEvent(selectedDate)}
                >
                  +
                </button>
              </div>

              <p className="calendar-selected-date">
                {formatLongDate(selectedDate)}
              </p>

              <label
                className="calendar-search-label"
                htmlFor="calendar-search"
              >
                Search this day
              </label>

              <input
                id="calendar-search"
                className="calendar-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find an event..."
              />

              <select
                className="calendar-filter"
                aria-label="Filter events by category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="All">All categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div className="calendar-agenda-list">
                {visibleEvents.length === 0 ? (
                  <div className="calendar-empty">
                    <span>✦</span>
                    <h3>No events planned</h3>
                    <p>
                      Your day is open. Add something you'd like to remember.
                    </p>

                    <button
                      type="button"
                      onClick={() => openNewEvent(selectedDate)}
                    >
                      Add an event
                    </button>
                  </div>
                ) : (
                  visibleEvents.map((event) => (
                    <article
                      className="calendar-agenda-item"
                      key={event.id}
                    >
                      <span
                        className={[
                          'calendar-agenda-accent',
                          CATEGORY_STYLES[event.category] ||
                            CATEGORY_STYLES.Other,
                        ].join(' ')}
                      />

                      <div className="calendar-agenda-content">
                        <span className="calendar-agenda-time">
                          {event.time || 'Any time'}
                        </span>

                        <h3>{event.title}</h3>

                        <span
                          className={[
                            'calendar-category-label',
                            CATEGORY_STYLES[event.category] ||
                              CATEGORY_STYLES.Other,
                          ].join(' ')}
                        >
                          {event.category}
                        </span>

                        {event.description && (
                          <p>{event.description}</p>
                        )}

                        <div className="calendar-agenda-actions">
                          <button
                            type="button"
                            onClick={() => openEditEvent(event)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          )}

          {!showEventForm && (
            <div className="calendar-upcoming">
              <p className="eyebrow">COMING UP</p>
              <h3>Upcoming events</h3>

              {upcomingEvents.length === 0 ? (
                <p className="calendar-upcoming-empty">
                  No upcoming events yet.
                </p>
              ) : (
                upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="calendar-upcoming-item"
                    onClick={() => {
                      setSelectedDate(event.date)

                      const date = new Date(`${event.date}T12:00:00`)

                      setCurrentMonth(
                        new Date(date.getFullYear(), date.getMonth(), 1)
                      )

                      setMessage('')
                      setError('')
                    }}
                  >
                    <span className="calendar-upcoming-date">
                      {formatShortDate(event.date)}
                    </span>

                    <span className="calendar-upcoming-title">
                      {event.title}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </aside>
      </div>

      <p className="calendar-storage-note">
        Your calendar events are currently saved in this browser for this account.
      </p>
    </section>
  )
}
