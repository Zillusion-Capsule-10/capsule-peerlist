import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 21V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17.657 6.343L19.071 4.929" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.929 19.071L6.343 17.657" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17.657 17.657L19.071 19.071" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.929 4.929L6.343 6.343" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function TopBar() {
  const { toggleTrackList, isMobileView, isTrackListVisible } = useApp();
  const { isDarkMode, toggleTheme } = useApp();
  const { user } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';

  return (
    <div style={{
      height: '60px',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobileView ? '0 12px' : '0 20px',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '12px' : '20px' }}>
        {isMobileView && !isTrackListVisible && !isLoginPage && (
          <button
            onClick={toggleTrackList}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '5px',
              marginLeft: '-5px',
            }}
          >
            ←
          </button>
        )}
        <Link 
          to="/" 
          style={{ 
            textDecoration: 'none', 
            color: 'inherit',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div 
            style={{ 
              cursor: user ? 'pointer' : 'default',
            }}
            onClick={() => user && toggleTrackList()}
          >
            <Logo className="h-6 w-auto text-primary" showText={!isMobileView} />
          </div>
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user && !isMobileView && (
          <Link
            to="/record"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Record Audio
          </Link>
        )}
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
          }}
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>
        {user ? (
          <Link
            to="/logout"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Logout
          </Link>
        ) : !isLoginPage && (
          <Link
            to="/login"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
