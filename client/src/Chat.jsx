
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const CHAT_ROOM = 'Pikadex'

export default function Chat({ user, accessToken }) {
  const displayName =
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
    if (!accessToken) {
      setConnectionStatus('disconnected')
      setError('Please log in to use chat.')
      return undefined
    }

    setConnectionStatus('connecting')
    setError('')

    // Send the token privately in the Socket.IO handshake.
    // The server determines the username after verifying this token.
    const socket = io({
      path: '/socket.io',
      auth: {
        token: accessToken,
      },
    })

    socketRef.current = socket

    function handleConnect() {
      setConnectionStatus('connected')
      setError('')

      // Do not send a username; the server derives it from the JWT.
      socket.emit('joinRoom', {
        room: CHAT_ROOM,
      })
    }

    function handleDisconnect() {
      setConnectionStatus('disconnected')
    }

    function handleConnectionError(err) {
      setConnectionStatus('disconnected')
      setError(
        err.message === 'Authentication required.' ||
          err.message === 'Authentication failed.' ||
          err.message === 'Invalid or expired session.'
          ? 'Your chat session is invalid or expired. Please sign in again.'
          : 'Unable to connect to chat. Check the server and try again.'
      )
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

    function handleChatError(message) {
      setError(
        typeof message === 'string'
          ? message
          : 'The chat request could not be completed.'
      )
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectionError)
    socket.on('messages', addMessages)
    socket.on('message', addMessages)
    socket.on('roomUsers', handleRoomUsers)
    socket.on('chatError', handleChatError)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectionError)
      socket.off('messages', addMessages)
      socket.off('message', addMessages)
      socket.off('roomUsers', handleRoomUsers)
      socket.off('chatError', handleChatError)

      socket.disconnect()

      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [accessToken])

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

    if (!text) return

    if (!socket || !socket.connected) {
      setError('Chat is disconnected. Please wait and reconnect.')
      return
    }

    if (text.length > 2000) {
      setError('Messages must contain no more than 2000 characters.')
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
    if (typeof message === 'string') return 'Pikadex'

    return message?.username || 'Pikadex'
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
                  {roomUser.username === displayName ? ' (You)' : ''}
                </span>
              </div>
            ))}
          </div>
        </aside>

        <div className="chat-panel">
          <div className="chat-panel-header">
            <div>
              <h2>{CHAT_ROOM} Chat</h2>
              <p className="muted">
                Signed in as {displayName}
              </p>
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
              const isOwnMessage = author === displayName

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
        Connected to the authenticated Pikadex Socket.IO room.
      </p>
    </section>
  )
}
