import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export function Logout() {
  const { signOut } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Error logging out:', error.message);
      }
    };

    performLogout();
  }, [signOut]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--bg-primary)',
        gap: '2rem',
        padding: '2rem',
      }}
    >
      <div style={{ width: '200px' }}>
        <Logo className="w-full h-auto text-primary" />
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Logging out...
      </div>
    </div>
  );
}
