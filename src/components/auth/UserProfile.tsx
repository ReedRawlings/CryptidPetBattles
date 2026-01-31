import { useAuth } from '@/hooks/useAuth';

interface UserProfileProps {
  onOpenAuth: () => void;
}

export function UserProfile({ onOpenAuth }: UserProfileProps) {
  const { user, stats, signOut, loading, isConfigured } = useAuth();

  if (loading) {
    return (
      <div style={styles.container}>
        <span style={styles.loading}>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <button onClick={onOpenAuth} style={styles.loginButton}>
          {isConfigured ? 'Sign In for Multiplayer' : 'Play as Guest'}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.profileInfo}>
        <span style={styles.username}>{user.display_name || user.username}</span>
        <span style={styles.mmr}>MMR: {user.mmr}</span>
        {stats && (
          <span style={styles.stats}>
            {stats.battle_wins}W / {stats.battle_losses}L
          </span>
        )}
      </div>
      <button onClick={signOut} style={styles.logoutButton}>
        Sign Out
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  username: {
    fontWeight: 600,
    color: '#fff',
    fontSize: 14,
  },
  mmr: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: 500,
  },
  stats: {
    fontSize: 11,
    color: '#888',
  },
  loginButton: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#6366f1',
    color: '#fff',
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '6px 12px',
    fontSize: 12,
    borderRadius: 4,
    border: '1px solid #444',
    backgroundColor: 'transparent',
    color: '#888',
    cursor: 'pointer',
  },
  loading: {
    color: '#888',
    fontSize: 14,
  },
};
