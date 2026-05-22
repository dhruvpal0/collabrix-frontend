import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Routes, Route } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import Auth from './pages/auth.jsx'
import config, { SERVER } from './config'

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#A29BFE']
const MY_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)]
const MY_NAME = 'User ' + Math.floor(Math.random() * 100)

const socket = io(SERVER)

// ── Piston API — language map ──
const PISTON_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  rust: { language: 'rust', version: '1.50.0' },
}

// ── Home page ──
function Home({ user, onLogout }) {
  const navigate = useNavigate()
  const [joinId, setJoinId] = useState('')

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 8)
    navigate(`/room/${id}`)
  }

  const joinRoom = () => {
    if (joinId.trim()) navigate(`/room/${joinId.trim()}`)
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#1e1e1e', gap: '16px'
    }}>
      {/* Top right — user info */}
      <div style={{
        position: 'absolute', top: '16px', right: '20px',
        display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        <span style={{ color: '#aaa', fontSize: '13px' }}>
          Hey, {user.name} 👋
        </span>
        <button onClick={onLogout} style={{
          background: '#3a3a3a', color: '#aaa', border: 'none',
          padding: '4px 12px', borderRadius: '20px',
          fontSize: '12px', cursor: 'pointer'
        }}>
          Logout
        </button>
      </div>

      <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        CodeTogether
      </h1>
      <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>
        Real-time collaborative code editor
      </p>

      <button onClick={createRoom} style={{
        background: '#4ECDC4', color: '#1e1e1e', border: 'none',
        padding: '12px 32px', borderRadius: '8px', fontSize: '15px',
        fontWeight: 600, cursor: 'pointer', width: '280px'
      }}>
        + Create New Room
      </button>

      <div style={{ display: 'flex', gap: '8px', width: '280px' }}>
        <input
          placeholder="Enter room ID..."
          value={joinId}
          onChange={e => setJoinId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && joinRoom()}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: '8px',
            background: '#2d2d2d', border: '1px solid #444',
            color: '#fff', fontSize: '14px'
          }}
        />
        <button onClick={joinRoom} style={{
          background: '#3a3a3a', color: '#fff', border: '1px solid #444',
          padding: '10px 18px', borderRadius: '8px', fontSize: '14px',
          cursor: 'pointer'
        }}>
          Join
        </button>
      </div>
    </div>
  )
}

// ── Room / Editor page ──
function Room() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [language, setLanguage] = useState('javascript')
  const [connected, setConnected] = useState(false)
  const [users, setUsers] = useState([])
  const [copied, setCopied] = useState(false)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const editorRef = useRef(null)
  const isRemoteChange = useRef(false)


  useEffect(() => {
    socket.emit('join-room', roomId)
    socket.emit('user-joined', { room: roomId, name: MY_NAME, color: MY_COLOR })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    if (socket.connected) setConnected(true)

    socket.on('code-update', (code) => {
      if (editorRef.current) {
        isRemoteChange.current = true
        const position = editorRef.current.getPosition()
        editorRef.current.setValue(code)
        editorRef.current.setPosition(position)
        isRemoteChange.current = false
      }
    })

    socket.on('users-update', (userList) => setUsers(userList))

    return () => {
      socket.off('code-update')
      socket.off('users-update')
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [roomId])

  const handleEditorMount = (editor) => {
    editorRef.current = editor
    editor.onDidChangeModelContent(() => {
      if (!isRemoteChange.current) {
        socket.emit('code-change', {
          room: roomId,
          code: editor.getValue()
        })
      }
    })
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Code run karo Piston API se ──
  const runCode = async () => {
    const code = editorRef.current?.getValue()
    if (!code?.trim()) return

    setRunning(true)
    setShowOutput(true)
    setOutput('⏳ Running...')

    try {
      const res = await fetch(`${config.BACKEND_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      })

      const data = await res.json()
      setOutput(data.output || 'No output')

    } catch (err) {
      setOutput('❌ Error: ' + err.message)
    } finally {
      setRunning(false)
    }
  }

  const leaveRoom = () => {
    socket.disconnect()
    navigate('/')
    window.location.reload()
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '8px 16px', background: '#2d2d2d',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid #3a3a3a', flexShrink: 0
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
          CodeTogether
        </span>

        <span style={{
          background: '#3a3a3a', color: '#aaa',
          fontSize: '12px', padding: '3px 10px', borderRadius: '20px'
        }}>
          {roomId}
        </span>

        <button onClick={copyLink} style={{
          background: copied ? '#4ECDC4' : '#3a3a3a',
          color: copied ? '#1e1e1e' : '#aaa',
          border: 'none', padding: '4px 12px',
          borderRadius: '20px', fontSize: '12px', cursor: 'pointer'
        }}>
          {copied ? '✓ Copied!' : '🔗 Copy Link'}
        </button>

        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          style={{
            background: '#3a3a3a', color: '#fff', border: 'none',
            padding: '4px 8px', borderRadius: '4px', fontSize: '13px'
          }}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="rust">Rust</option>
        </select>

        {/* ── RUN BUTTON ── */}
        <button
          onClick={runCode}
          disabled={running}
          style={{
            background: running ? '#3a3a3a' : '#4ECDC4',
            color: running ? '#aaa' : '#1e1e1e',
            border: 'none', padding: '6px 20px',
            borderRadius: '6px', fontSize: '13px',
            fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {running ? '⏳ Running...' : '▶ Run'}
        </button>

        {/* Users avatars */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          {users.map((u, i) => (
            <div key={i} title={u.name} style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: u.color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '11px',
              color: '#1e1e1e', fontWeight: 700,
              border: '2px solid #1e1e1e'
            }}>
              {u.name.slice(-2)}
            </div>
          ))}
          <span style={{
            fontSize: '12px', marginLeft: '4px',
            color: connected ? '#4ECDC4' : '#FF6B6B'
          }}>
            {connected ? '● Live' : '○ Connecting...'}
          </span>
        </div>
        <button
          onClick={leaveRoom}
          style={{
            background: '#FF6B6B',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Leave Room
        </button>
      </div>

      {/* ── Editor + Output split ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Editor */}
        <div style={{ flex: showOutput ? '1 1 60%' : '1 1 100%', overflow: 'hidden' }}>
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 16 },
              cursorBlinking: 'smooth',
              smoothScrolling: true
            }}
          />
        </div>

        {/* ── Output Panel ── */}
        {showOutput && (
          <div style={{
            flex: '0 0 35%', background: '#0d0d0d',
            borderTop: '1px solid #3a3a3a',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{
              padding: '6px 16px', background: '#1a1a1a',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderBottom: '1px solid #3a3a3a'
            }}>
              <span style={{ color: '#aaa', fontSize: '12px', fontWeight: 600 }}>
                OUTPUT
              </span>
              <button
                onClick={() => setShowOutput(false)}
                style={{
                  background: 'none', border: 'none',
                  color: '#666', fontSize: '16px', cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            <pre style={{
              flex: 1, margin: 0, padding: '12px 16px',
              color: output.startsWith('❌') ? '#FF6B6B' : '#4ECDC4',
              fontSize: '13px', fontFamily: 'monospace',
              overflowY: 'auto', whiteSpace: 'pre-wrap'
            }}>
              {output || 'No output yet.'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Routes ──
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userData) => setUser(userData)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (!user) return <Auth onLogin={handleLogin} />

  return (
    <Routes>
      <Route path="/" element={<Home user={user} onLogout={handleLogout} />} />
      <Route path="/room/:roomId" element={<Room user={user} onLogout={handleLogout} />} />
    </Routes>
  )
}