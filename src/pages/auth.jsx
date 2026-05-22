import { useState } from 'react'
import config, { SERVER } from '../config'

// const SERVER = config.BACKEND_URL

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin]   = useState(true)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)

    const endpoint = isLogin ? '/auth/login' : '/auth/signup'
    const body     = isLogin
      ? { email, password }
      : { email, password, name }

    try {
      const res  = await fetch(SERVER + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user',  JSON.stringify(data.user))
        onLogin(data.user)
      }
    } catch {
      setError('Server se connect nahi ho pa raha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#1e1e1e'
    }}>
      <div style={{
        background: '#2d2d2d', borderRadius: '12px',
        padding: '36px', width: '360px',
        border: '1px solid #3a3a3a'
      }}>
        <h2 style={{ color: '#fff', margin: '0 0 8px', fontSize: '22px' }}>
          CodeTogether
        </h2>
        <p style={{ color: '#aaa', margin: '0 0 28px', fontSize: '14px' }}>
          {isLogin ? 'Apne account mein login karo' : 'Naya account banao'}
        </p>

        {!isLogin && (
          <input
            placeholder="Tera naam"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        )}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={inputStyle}
        />

        {error && (
          <p style={{ color: '#FF6B6B', fontSize: '13px', margin: '0 0 16px' }}>
            ❌ {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: '100%', padding: '12px',
            background: loading ? '#3a3a3a' : '#4ECDC4',
            color: loading ? '#aaa' : '#1e1e1e',
            border: 'none', borderRadius: '8px',
            fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Wait karo...' : (isLogin ? 'Login' : 'Sign Up')}
        </button>

        <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
          {isLogin ? 'Account nahi hai? ' : 'Account hai? '}
          <span
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            style={{ color: '#4ECDC4', cursor: 'pointer' }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  marginBottom: '14px', borderRadius: '8px',
  background: '#1e1e1e', border: '1px solid #444',
  color: '#fff', fontSize: '14px',
  boxSizing: 'border-box'
}