
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const CHAT_ROOM = 'Pikadex'

export default function Chat({ user }) {
  const username =
    user?.username ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Pikadex User'

  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [messageText, setMessageText] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [error, setError] = useState('')

  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
    })

    socketRef.current = socket

    function handleConnect() {
      setConnectionStatus('connected')
      setError('')

      // Use the existing event defined by the Express Socket.IO server.
      socket.emit('joinRoom', {
        username,
        room: CHAT_ROOM,
      })
    }

    function handleDisconnect() {
      setConnectionStatus('disconnected')
    }

    function handleConnectionError() {
      setConnectionStatus('disconnected')
      setError('Unable to connect to chat. Check that the backend is running.')
    }

    function addMessages(payload) {
      const incoming = Array.isArray(payload) ? payload : [payload]

      setMessages((current) =>
        [...current, ...incoming.filter(Boolean)].slice(-200)
      )
    }

    function handleRoomUsers(data) {
      if (data?.room === CHAT_ROOM && Array.isArray(data.users)) {
        setUsers(data.users)
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectionError)

    // The existing server sends the welcome event as "messages"
    // and ordinary chat messages as "message".
    socket.on('messages', addMessages)
    socket.on('message', addMessages)
    socket.on('roomUsers', handleRoomUsers)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectionError)
      socket.off('messages', addMessages)
      socket.off('message', addMessages)
      socket.off('roomUsers', handleRoomUsers)

      socket.disconnect()
      socketRef.current = null
    }
  }, [username])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages])

  function handleSend(event) {
    event.preventDefault()

    const text = messageText.trim()
    const socket = socketRef.current

    if (!text || !socket || !socket.connected) {
      setError('Chat is not connected. Please wait and try again.')
      return
    }

    setError('')
    socket.emit('chatMessage', text)
    setMessageText('')
  }

  function getMessageText(message) {
    if (typeof message === 'string') return message

    return message?.text || message?.message || ''
  }

  function getMessageAuthor(message) {
    if (typeof message === 'string') return 'System'

    return message?.username || 'System'
  }

  function getMessageTime(message) {
    return typeof message === 'object' && message !== null
      ? message.time || ''
      : ''
  }

  return (
    <section className="chat-page">
      <div className="chat-heading">
        <div>
          <p className="eyebrow">PIKADEX COMMUNITY</p>
          <h1>Real-time Chat</h1>
          <p className="muted">
            Chat instantly with people connected to the same room.
          </p>
        </div>

        <span
          className={`chat-connection ${
            connectionStatus === 'connected' ? 'chat-online' : ''
          }`}
        >
          <span className="chat-status-dot" />
          {connectionStatus === 'connected'
            ? 'Connected'
            : connectionStatus === 'connecting'
              ? 'Connecting...'
              : 'Disconnected'}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <p className="eyebrow">CURRENT ROOM</p>
          <h2>{CHAT_ROOM}</h2>
          <p className="muted">
            {users.length} {users.length === 1 ? 'member' : 'members'}
          </p>

          <div className="chat-user-list">
            {users.map((roomUser, index) => (
              <div
                className="chat-user"
                key={roomUser.id || `${roomUser.username}-${index}`}
              >
                <span className="chat-avatar">
                  {(roomUser.username || 'U').charAt(0).toUpperCase()}
                </span>

                <span className="chat-user-name">
                  {roomUser.username || 'User'}
                  {roomUser.username === username ? ' (You)' : ''}
                </span>
              </div>
            ))}
          </div>
        </aside>

        <div className="chat-panel">
          <div className="chat-panel-header">
            <div>
              <h2>{CHAT_ROOM} Chat</h2>
              <p className="muted">Signed in as {username}</p>
            </div>
            <span className="chat-live-label">LIVE</span>
          </div>

          <div
            className="chat-messages"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {messages.length === 0 && (
              <div className="chat-empty">
                <span>💬</span>
                <h3>Welcome to Pikadex Chat</h3>
                <p className="muted">
                  Messages will appear here when someone sends one.
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              const author = getMessageAuthor(message)
              const text = getMessageText(message)
              const time = getMessageTime(message)
              const isOwnMessage = author === username

              return (
                <article
                  className={`chat-message ${
                    isOwnMessage ? 'chat-message-own' : ''
                  }`}
                  key={`${index}-${time}-${author}`}
                >
                  <div className="chat-message-meta">
                    <strong>{author}</strong>
                    {time && <time>{time}</time>}
                  </div>

                  <div className="chat-bubble">{text}</div>
                </article>
              )
            })}

            <div ref={bottomRef} />
          </div>

          <form className="chat-composer" onSubmit={handleSend}>
            <input
              type="text"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder={
                connectionStatus === 'connected'
                  ? 'Write a message...'
                  : 'Waiting for chat connection...'
              }
              aria-label="Message"
              maxLength={2000}
              disabled={connectionStatus !== 'connected'}
              required
            />

            <button
              type="submit"
              disabled={
                connectionStatus !== 'connected' || !messageText.trim()
              }
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <p className="muted chat-footer">
        Messages are relayed through your existing Socket.IO server.
        This interface does not currently provide message history.
      </p>
    </section>
  )
}
