import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signUp, signInWithGoogle, error, isConfigured } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (mode === 'login') {
      await signIn(email, password);
    } else {
      await signUp(email, password, username);
    }

    setIsSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    await signInWithGoogle();
    setIsSubmitting(false);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setEmail('');
    setPassword('');
    setUsername('');
  };

  if (!isConfigured) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button style={styles.closeButton} onClick={onClose}>x</button>
          <h2 style={styles.title}>Multiplayer Not Available</h2>
          <p style={styles.text}>
            Supabase is not configured. To enable multiplayer features, add your
            Supabase credentials to <code>.env.local</code>.
          </p>
          <p style={styles.text}>
            You can still play single-player mode against AI opponents.
          </p>
          <button style={styles.primaryButton} onClick={onClose}>
            Continue to Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>x</button>

        <h2 style={styles.title}>
          {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
        </h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                minLength={3}
                maxLength={20}
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              minLength={6}
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.primaryButton,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting
              ? 'Loading...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          style={styles.googleButton}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p style={styles.switchMode}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={toggleMode} style={styles.switchButton}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      style={{ marginRight: 8 }}
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
    border: '1px solid #333',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
  },
  title: {
    margin: '0 0 24px',
    fontSize: 24,
    fontWeight: 600,
    textAlign: 'center',
    color: '#fff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#aaa',
  },
  input: {
    padding: '12px 16px',
    fontSize: 16,
    borderRadius: 8,
    border: '1px solid #444',
    backgroundColor: '#0f0f1a',
    color: '#fff',
    outline: 'none',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    margin: 0,
    textAlign: 'center',
  },
  primaryButton: {
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#6366f1',
    color: '#fff',
    cursor: 'pointer',
    marginTop: 8,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    position: 'relative',
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 500,
    borderRadius: 8,
    border: '1px solid #444',
    backgroundColor: '#fff',
    color: '#333',
    cursor: 'pointer',
    width: '100%',
  },
  switchMode: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
    fontSize: 14,
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    padding: 0,
  },
  text: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 1.5,
  },
};
