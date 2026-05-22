import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import config, { SERVER } from './config';

// ------------------------------------------------------------------
// Styling constants & animations
// ------------------------------------------------------------------
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#A29BFE'];
const MY_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)];
const MY_NAME = 'User ' + Math.floor(Math.random() * 100);
const socket = io(SERVER);

// Language options for Piston API
const PISTON_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  rust: { language: 'rust', version: '1.50.0' },
};

// ------------------------------------------------------------------
// Global Styles (injected)
// ------------------------------------------------------------------
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap');
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0a0a0f;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #1a1a1a;
  }
  ::-webkit-scrollbar-thumb {
    background: #4ECDC4;
    border-radius: 8px;
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes glowPulse {
    0% { opacity: 0.4; transform: scale(0.98); }
    100% { opacity: 0.8; transform: scale(1.02); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .glass-card {
    background: rgba(20, 20, 30, 0.75);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(78, 205, 196, 0.2);
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  }
  .btn-hover {
    transition: all 0.2s ease;
  }
  .btn-hover:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

// ------------------------------------------------------------------
// Auth Component (Improved UI)
// ------------------------------------------------------------------
function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    if (!email.trim()) return setError('Email is required');
    if (!password.trim()) return setError('Password is required');
    if (!isLogin && !name.trim()) return setError('Name is required');
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    const body = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(SERVER + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      }
    } catch {
      setError('Server connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={stylesAuth.container}>
      <div style={stylesAuth.bgGradient} />
      <div style={stylesAuth.card} className="glass-card">
        <div style={stylesAuth.iconWrapper}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 17L12 22L22 17" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 12L12 17L22 12" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 style={stylesAuth.title}>CodeTogether</h2>
        <p style={stylesAuth.subtitle}>
          {isLogin ? 'Welcome back · Sign in to continue' : 'Create an account · Start coding together'}
        </p>

        {!isLogin && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={stylesAuth.input}
            className="animated-input"
          />
        )}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={stylesAuth.input}
          className="animated-input"
        />
        <div style={stylesAuth.passWrapper}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={stylesAuth.input}
            className="animated-input"
          />
          <button onClick={() => setShowPassword(!showPassword)} style={stylesAuth.eyeBtn}>
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {error && (
          <div style={stylesAuth.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{ ...stylesAuth.submitBtn, ...(loading && stylesAuth.submitDisabled) }}
          className="btn-hover"
        >
          {loading ? <div style={stylesAuth.spinner} /> : isLogin ? 'Login →' : 'Sign Up →'}
        </button>

        <div style={stylesAuth.switch}>
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={stylesAuth.switchBtn}>
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </div>
      </div>
      <style>{`
        .animated-input {
          transition: all 0.2s ease;
        }
        .animated-input:focus {
          transform: scale(1.01);
          border-color: #4ECDC4 !important;
          box-shadow: 0 0 0 3px rgba(78,205,196,0.2);
        }
      `}</style>
    </div>
  );
}

const stylesAuth = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
    position: 'relative',
    padding: '20px',
  },
  bgGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 20% 30%, rgba(78,205,196,0.15), transparent 70%)',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px 32px',
    borderRadius: '32px',
    textAlign: 'center',
    animation: 'fadeSlideUp 0.5s ease',
  },
  iconWrapper: { marginBottom: '20px' },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #fff 0%, #4ECDC4 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: { color: '#9ca3af', fontSize: '14px', marginBottom: '32px' },
  input: {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(15,15,25,0.9)',
    border: '1px solid #2a2a3a',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '14px',
    marginBottom: '16px',
    outline: 'none',
  },
  passWrapper: { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    opacity: 0.7,
  },
  errorBox: {
    background: 'rgba(255,75,75,0.12)',
    border: '1px solid #ff6b6b',
    borderRadius: '14px',
    padding: '10px 16px',
    fontSize: '13px',
    color: '#ff8a8a',
    marginBottom: '20px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(105deg, #4ECDC4 0%, #3ba89f 100%)',
    border: 'none',
    borderRadius: '40px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0a0a0f',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  submitDisabled: { opacity: 0.6, cursor: 'not-allowed', transform: 'none' },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
  switch: { display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' },
  switchBtn: { background: 'none', border: 'none', color: '#4ECDC4', fontWeight: 600, cursor: 'pointer' },
};

// ------------------------------------------------------------------
// Home Component (Improved UI)
// ------------------------------------------------------------------
function Home({ user, onLogout }) {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState('');

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 8);
    navigate(`/room/${id}`);
  };

  const joinRoom = () => {
    if (joinId.trim()) navigate(`/room/${joinId.trim()}`);
  };

  return (
    <div style={stylesHome.container}>
      <div style={stylesHome.bgOrb} />
      <div style={stylesHome.userBar}>
        <div style={stylesHome.userInfo}>
          <span>👋 {user.name}</span>
          <button onClick={onLogout} style={stylesHome.logoutBtn} className="btn-hover">
            Logout
          </button>
        </div>
      </div>

      <div style={stylesHome.card} className="glass-card">
        <div style={stylesHome.logo}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 17L12 22L22 17" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 12L12 17L22 12" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 style={stylesHome.title}>CodeTogether</h1>
        <p style={stylesHome.subtitle}>Real‑time collaborative editor · Code with friends instantly</p>

        <button onClick={createRoom} style={stylesHome.createBtn} className="btn-hover">
          ✨ Create New Room
        </button>

        <div style={stylesHome.divider}>
          <span>or join existing</span>
        </div>

        <div style={stylesHome.joinBox}>
          <input
            placeholder="Room ID (e.g., a1b2c3)"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            style={stylesHome.joinInput}
          />
          <button onClick={joinRoom} style={stylesHome.joinBtn} className="btn-hover">
            Join →
          </button>
        </div>
      </div>
    </div>
  );
}

const stylesHome = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
    position: 'relative',
    padding: '20px',
  },
  bgOrb: {
    position: 'absolute',
    width: '60vh',
    height: '60vh',
    background: 'radial-gradient(circle, rgba(78,205,196,0.2) 0%, rgba(0,0,0,0) 70%)',
    borderRadius: '50%',
    top: '10%',
    left: '-20%',
  },
  userBar: {
    position: 'absolute',
    top: '24px',
    right: '32px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(30,30,40,0.7)',
    backdropFilter: 'blur(12px)',
    padding: '8px 18px',
    borderRadius: '40px',
    border: '1px solid rgba(78,205,196,0.2)',
    color: '#e0e0e0',
    fontSize: '14px',
  },
  logoutBtn: {
    background: '#2a2a3a',
    border: 'none',
    color: '#ccc',
    padding: '4px 12px',
    borderRadius: '30px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  card: {
    maxWidth: '520px',
    width: '100%',
    padding: '48px 40px',
    borderRadius: '40px',
    textAlign: 'center',
    animation: 'fadeSlideUp 0.5s ease',
  },
  logo: { marginBottom: '24px' },
  title: {
    fontSize: '36px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #fff 0%, #4ECDC4 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '12px',
  },
  subtitle: { color: '#9ca3af', fontSize: '15px', marginBottom: '40px' },
  createBtn: {
    background: '#4ECDC4',
    color: '#0a0a0f',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '60px',
    fontSize: '16px',
    fontWeight: 600,
    width: '100%',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    color: '#5a5a70',
    fontSize: '12px',
    margin: '20px 0',
    '::before': { content: '""', flex: 1, height: '1px', background: '#2a2a3a', marginRight: '12px' },
    '::after': { content: '""', flex: 1, height: '1px', background: '#2a2a3a', marginLeft: '12px' },
  },
  joinBox: { display: 'flex', gap: '12px' },
  joinInput: {
    flex: 1,
    background: 'rgba(15,15,25,0.9)',
    border: '1px solid #2a2a3a',
    borderRadius: '60px',
    padding: '14px 20px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  joinBtn: {
    background: '#2a2a3a',
    border: '1px solid #4ECDC4',
    color: '#4ECDC4',
    padding: '0 24px',
    borderRadius: '60px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

// ------------------------------------------------------------------
// Room / Editor Component (Improved UI)
// ------------------------------------------------------------------
function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('javascript');
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const editorRef = useRef(null);
  const isRemoteChange = useRef(false);

  // Socket events
  useEffect(() => {
    socket.emit('join-room', roomId);
    socket.emit('user-joined', { room: roomId, name: MY_NAME, color: MY_COLOR });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    if (socket.connected) setConnected(true);

    socket.on('code-update', (code) => {
      if (editorRef.current) {
        isRemoteChange.current = true;
        const pos = editorRef.current.getPosition();
        editorRef.current.setValue(code);
        editorRef.current.setPosition(pos);
        isRemoteChange.current = false;
      }
    });

    socket.on('users-update', (userList) => setUsers(userList));

    return () => {
      socket.off('code-update');
      socket.off('users-update');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [roomId]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeModelContent(() => {
      if (!isRemoteChange.current) {
        socket.emit('code-change', { room: roomId, code: editor.getValue() });
      }
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runCode = async () => {
    const code = editorRef.current?.getValue();
    if (!code?.trim()) return;
    setRunning(true);
    setShowOutput(true);
    setOutput('⏳ Running...');
    try {
      const res = await fetch(`${config.BACKEND_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      setOutput(data.output || '✅ No output');
    } catch (err) {
      setOutput('❌ Error: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const leaveRoom = () => {
    socket.disconnect();
    navigate('/');
    window.location.reload();
  };

  return (
    <div style={stylesRoom.container}>
      {/* Header */}
      <div style={stylesRoom.header}>
        <div style={stylesRoom.logoSection}>
          <span style={stylesRoom.logoText}>⌨️ CodeTogether</span>
          <span style={stylesRoom.roomBadge}>{roomId}</span>
          <button onClick={copyLink} style={stylesRoom.copyBtn} className="btn-hover">
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
        </div>

        <div style={stylesRoom.controls}>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={stylesRoom.langSelect}>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="rust">Rust</option>
          </select>

          <button onClick={runCode} disabled={running} style={{ ...stylesRoom.runBtn, ...(running && stylesRoom.runBtnDisabled) }} className="btn-hover">
            {running ? '⏳ Running...' : '▶ Run'}
          </button>

          <div style={stylesRoom.userGroup}>
            {users.map((u, i) => (
              <div key={i} style={{ ...stylesRoom.avatar, background: u.color }} title={u.name}>
                {u.name.slice(0, 2).toUpperCase()}
              </div>
            ))}
            <span style={{ ...stylesRoom.liveDot, color: connected ? '#4ECDC4' : '#FF6B6B' }}>
              {connected ? '● Live' : '○ Connecting'}
            </span>
          </div>

          <button onClick={leaveRoom} style={stylesRoom.leaveBtn} className="btn-hover">
            Leave
          </button>
        </div>
      </div>

      {/* Editor + Output Split */}
      <div style={stylesRoom.editorArea}>
        <div style={{ ...stylesRoom.editorWrapper, flex: showOutput ? '1 1 65%' : '1 1 100%' }}>
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
              smoothScrolling: true,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        </div>

        {showOutput && (
          <div style={stylesRoom.outputPanel}>
            <div style={stylesRoom.outputHeader}>
              <span>📟 OUTPUT</span>
              <button onClick={() => setShowOutput(false)} style={stylesRoom.closeOutput}>
                ✕
              </button>
            </div>
            <pre style={stylesRoom.outputContent}>
              {output || '// No output yet. Click Run to execute code.'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

const stylesRoom = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a0f',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    background: 'rgba(15,15,25,0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #2a2a3a',
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  logoSection: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  logoText: { color: '#fff', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' },
  roomBadge: {
    background: '#1e1e2a',
    padding: '4px 12px',
    borderRadius: '40px',
    fontSize: '12px',
    color: '#4ECDC4',
    fontFamily: 'monospace',
  },
  copyBtn: {
    background: '#2a2a3a',
    border: 'none',
    color: '#ccc',
    padding: '4px 12px',
    borderRadius: '30px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  controls: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  langSelect: {
    background: '#1e1e2a',
    border: '1px solid #3a3a4a',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '30px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  runBtn: {
    background: '#4ECDC4',
    border: 'none',
    color: '#0a0a0f',
    padding: '6px 20px',
    borderRadius: '40px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  },
  runBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  userGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#1e1e1e',
    border: '2px solid #0a0a0f',
  },
  liveDot: { fontSize: '12px', fontWeight: 500, marginLeft: '4px' },
  leaveBtn: {
    background: '#ff6b6b20',
    border: '1px solid #ff6b6b',
    color: '#ff8a8a',
    padding: '6px 16px',
    borderRadius: '30px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  editorArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  editorWrapper: { overflow: 'hidden', transition: 'flex 0.2s ease' },
  outputPanel: {
    flex: '0 0 35%',
    background: '#0d0d15',
    borderTop: '1px solid #2a2a3a',
    display: 'flex',
    flexDirection: 'column',
  },
  outputHeader: {
    padding: '10px 20px',
    background: '#151520',
    borderBottom: '1px solid #2a2a3a',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontWeight: 600,
    color: '#aaa',
  },
  closeOutput: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '16px' },
  outputContent: {
    flex: 1,
    margin: 0,
    padding: '16px 20px',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: '13px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
  },
};

// ------------------------------------------------------------------
// Main App with Routes
// ------------------------------------------------------------------
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <Routes>
      <Route path="/" element={<Home user={user} onLogout={handleLogout} />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
}