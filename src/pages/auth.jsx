import { useState, useEffect, useRef } from 'react';
import config, { SERVER } from '../config';
import * as THREE from 'three';

// Improved Auth component with 3D background, animations, and password visibility toggle
export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin]   = useState(true);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animationIdRef = useRef(null);
  const torusKnotRef = useRef(null);
  const particlesRef = useRef(null);

  // Toggle between login and signup with field reset
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setName('');
    // Keep email for convenience
  };

  // Handle form submission
  const submit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    const body     = isLogin
      ? { email, password }
      : { email, password, name };

    try {
      const res  = await fetch(SERVER + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        onLogin(data.user);
      }
    } catch {
      setError('Unable to connect to server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize 3D scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.008);
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x4ECDC4, 1);
    pointLight1.position.set(3, 3, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff6b6b, 0.8);
    pointLight2.position.set(-3, 2, 5);
    scene.add(pointLight2);
    
    const backLight = new THREE.PointLight(0x4a90e2, 0.5);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);
    
    // Central 3D Model: Torus Knot with gradient material
    const geometry = new THREE.TorusKnotGeometry(1.2, 0.35, 200, 32, 3, 4);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4ECDC4,
      emissive: 0x1a4d4a,
      roughness: 0.3,
      metalness: 0.7,
      emissiveIntensity: 0.6
    });
    const torusKnot = new THREE.Mesh(geometry, material);
    scene.add(torusKnot);
    torusKnotRef.current = torusKnot;
    
    // Add a wireframe outer sphere for extra effect
    const sphereGeo = new THREE.SphereGeometry(1.8, 32, 32);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x4ECDC4,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const wireframeSphere = new THREE.Mesh(sphereGeo, wireframeMat);
    scene.add(wireframeSphere);
    
    // Particle system
    const particlesCount = 1800;
    const particlesGeometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount; i++) {
      posArray[i*3] = (Math.random() - 0.5) * 60;
      posArray[i*3+1] = (Math.random() - 0.5) * 40;
      posArray[i*3+2] = (Math.random() - 0.5) * 40 - 20;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x4ECDC4,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    particlesRef.current = particlesMesh;
    
    // Add floating orbs around
    const orbGroup = [];
    const orbColors = [0x4ECDC4, 0xff6b6b, 0x4a90e2, 0xffb347];
    for (let i = 0; i < 24; i++) {
      const orbGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const orbMat = new THREE.MeshStandardMaterial({
        color: orbColors[i % orbColors.length],
        emissive: 0x331133,
        emissiveIntensity: 0.4
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      const radius = 2.8 + Math.random() * 1.2;
      const angle = (i / 24) * Math.PI * 2;
      const height = Math.sin(angle * 3) * 1.2;
      orb.position.x = Math.cos(angle) * radius;
      orb.position.z = Math.sin(angle) * radius;
      orb.position.y = height;
      scene.add(orb);
      orbGroup.push({ mesh: orb, angle, radius, heightSpeed: 0.5 + Math.random() * 0.5, originalY: height });
    }
    
    // Animation variables
    let time = 0;
    
    // Animation loop
    const animate = () => {
      time += 0.012;
      if (torusKnotRef.current) {
        torusKnotRef.current.rotation.x += 0.008;
        torusKnotRef.current.rotation.y += 0.012;
        torusKnotRef.current.rotation.z += 0.005;
      }
      
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.0005;
        particlesRef.current.rotation.x += 0.0003;
      }
      
      wireframeSphere.rotation.x = time * 0.2;
      wireframeSphere.rotation.y = time * 0.3;
      
      // Animate orbs
      orbGroup.forEach((orb, idx) => {
        orb.mesh.position.y = orb.originalY + Math.sin(time * 2 + idx) * 0.2;
        orb.mesh.rotation.x += 0.02;
        orb.mesh.rotation.y += 0.03;
      });
      
      // Subtle camera movement
      camera.position.x += (0 - camera.position.x) * 0.05;
      camera.position.y += (Math.sin(time * 0.3) * 0.08 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* 3D Canvas Container */}
      <div ref={containerRef} style={styles.canvasContainer} />
      
      {/* Overlay Gradient for better readability */}
      <div style={styles.overlay} />
      
      {/* Auth Form */}
      <div style={styles.formWrapper} className="auth-form">
        <div style={styles.glowEffect} />
        
        <div style={styles.card}>
          <div style={styles.headerIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M2 17L12 22L22 17" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M2 12L12 17L22 12" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <h2 style={styles.title}>CodeTogether</h2>
          <p style={styles.subtitle}>
            {isLogin ? 'Welcome back! Please login to your account' : 'Create your account to get started'}
          </p>
          
          {!isLogin && (
            <div style={styles.inputWrapper}>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={styles.input}
                className="animated-input"
              />
            </div>
          )}
          
          <div style={styles.inputWrapper}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              className="animated-input"
            />
          </div>
          
          <div style={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={styles.input}
              className="animated-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              className="eye-toggle"
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="3" x2="21" y2="21" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
          
          {error && (
            <div style={styles.errorContainer} className="error-shake">
              <span style={styles.errorIcon}>⚠️</span>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}
          
          <button
            onClick={submit}
            disabled={loading}
            style={{...styles.submitButton, ...(loading ? styles.buttonDisabled : {})}}
            className="submit-btn"
          >
            {loading ? (
              <div style={styles.loaderWrapper}>
                <div style={styles.spinner} />
                <span>Processing...</span>
              </div>
            ) : (
              isLogin ? 'Login →' : 'Create Account →'
            )}
          </button>
          
          <div style={styles.footer}>
            <p style={styles.footerText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span onClick={toggleMode} style={styles.toggleLink}>
                {isLogin ? 'Sign Up' : 'Login'}
              </span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Inject global animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes glowPulse {
          0% {
            opacity: 0.3;
            transform: scale(0.95);
          }
          100% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }
        
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        
        .auth-form {
          animation: fadeInUp 0.6s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
        }
        
        .animated-input {
          transition: all 0.25s ease;
        }
        
        .animated-input:focus {
          transform: scale(1.01);
          box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.2);
        }
        
        .submit-btn {
          transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
          position: relative;
          overflow: hidden;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(78, 205, 196, 0.3);
        }
        
        .submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        
        .eye-toggle {
          transition: all 0.2s ease;
        }
        
        .eye-toggle:hover {
          transform: scale(1.1);
          opacity: 1 !important;
        }
        
        .error-shake {
          animation: errorShake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}

// Styles object with enhanced design and dark mode
const styles = {
  container: {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
  },
  canvasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at center, rgba(5,5,20,0.4) 0%, rgba(2,2,10,0.85) 100%)',
    zIndex: 1,
  },
  formWrapper: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '460px',
    margin: '20px',
  },
  glowEffect: {
    position: 'absolute',
    top: '-10px',
    left: '-10px',
    right: '-10px',
    bottom: '-10px',
    background: 'linear-gradient(135deg, rgba(78,205,196,0.3) 0%, rgba(255,107,107,0.2) 100%)',
    borderRadius: '32px',
    filter: 'blur(24px)',
    zIndex: -1,
    animation: 'glowPulse 3s infinite alternate',
  },
  card: {
    background: 'rgba(25, 25, 40, 0.85)',
    backdropFilter: 'blur(16px)',
    borderRadius: '28px',
    padding: '40px 36px',
    border: '1px solid rgba(78, 205, 196, 0.25)',
    boxShadow: '0 25px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(78,205,196,0.1) inset',
    transition: 'transform 0.3s ease',
  },
  headerIcon: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  title: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #fff 0%, #4ECDC4 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    color: '#b0b0c0',
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: '32px',
    fontWeight: '400',
  },
  inputWrapper: {
    marginBottom: '16px',
  },
  passwordWrapper: {
    position: 'relative',
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(78, 205, 196, 0.3)',
    borderRadius: '16px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  eyeButton: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '10px',
    opacity: 0.7,
  },
  errorContainer: {
    background: 'rgba(255, 75, 75, 0.12)',
    borderRadius: '14px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    backdropFilter: 'blur(4px)',
  },
  errorIcon: {
    fontSize: '18px',
  },
  errorText: {
    color: '#ff8a8a',
    fontSize: '13px',
    margin: 0,
    fontWeight: '500',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(105deg, #4ECDC4 0%, #3ba89f 100%)',
    color: '#0a0a14',
    border: 'none',
    borderRadius: '40px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    marginBottom: '20px',
    letterSpacing: '0.3px',
  },
  buttonDisabled: {
    background: '#3a3a4a',
    cursor: 'not-allowed',
    opacity: 0.7,
    transform: 'none',
  },
  loaderWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  footer: {
    textAlign: 'center',
  },
  footerText: {
    color: '#a0a0b5',
    fontSize: '14px',
    margin: 0,
  },
  toggleLink: {
    color: '#4ECDC4',
    cursor: 'pointer',
    fontWeight: '600',
    marginLeft: '4px',
    transition: 'color 0.2s',
  },
};

// Add keyframe for spinner in style
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);