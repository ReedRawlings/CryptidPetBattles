import { useState, useEffect } from 'react';
import { getLeaderboard } from '@/services/leaderboardService';
import { useAuth } from '@/hooks/useAuth';
import type { LeaderboardEntry } from '@/types/multiplayer';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isConfigured } = useAuth();

  useEffect(() => {
    if (isOpen && isConfigured) {
      setLoading(true);
      getLeaderboard(50).then((data) => {
        setEntries(data);
        setLoading(false);
      });
    }
  }, [isOpen, isConfigured]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>x</button>
        <h2 style={styles.title}>Leaderboard</h2>

        {!isConfigured ? (
          <p style={styles.message}>
            Sign in to view the leaderboard and compete with other players.
          </p>
        ) : loading ? (
          <p style={styles.message}>Loading...</p>
        ) : entries.length === 0 ? (
          <p style={styles.message}>
            No players on the leaderboard yet. Be the first!
          </p>
        ) : (
          <div style={styles.list}>
            <div style={styles.header}>
              <span style={styles.rank}>#</span>
              <span style={styles.name}>Player</span>
              <span style={styles.mmr}>MMR</span>
              <span style={styles.record}>W/L</span>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  ...styles.row,
                  ...(entry.id === user?.id ? styles.currentUser : {}),
                }}
              >
                <span style={styles.rank}>
                  {entry.rank <= 3 ? ['', '1st', '2nd', '3rd'][entry.rank] : entry.rank}
                </span>
                <span style={styles.name}>
                  {entry.display_name || entry.username}
                </span>
                <span style={styles.mmr}>{entry.mmr}</span>
                <span style={styles.record}>
                  {entry.battle_wins}/{entry.battle_losses}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80vh',
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
    margin: '0 0 20px',
    fontSize: 24,
    fontWeight: 600,
    textAlign: 'center',
    color: '#fff',
  },
  message: {
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  header: {
    display: 'grid',
    gridTemplateColumns: '50px 1fr 80px 80px',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid #333',
    color: '#888',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '50px 1fr 80px 80px',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: '#ddd',
  },
  currentUser: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
  },
  rank: {
    fontWeight: 600,
    color: '#6366f1',
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mmr: {
    textAlign: 'right',
    fontWeight: 500,
  },
  record: {
    textAlign: 'right',
    color: '#888',
  },
};
