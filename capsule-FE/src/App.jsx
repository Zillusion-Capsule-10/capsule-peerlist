import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './supabaseClient';
import { Logout } from './components/Logout';
import { TopBar } from './components/TopBar';
import { AudioPlayer } from './components/AudioPlayer';
import { TrackList } from './components/TrackList';
import { ResizablePanel } from './components/ResizablePanel';
import { useApp } from './context/AppContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Logo } from './components/Logo';
import { AudioRecorder } from './components/AudioRecorder';

function Home() {
  const { isMobileView } = useApp();

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {isMobileView ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <TrackList />
          <AudioPlayer />
        </div>
      ) : (
        <ResizablePanel>
          <TrackList />
          <AudioPlayer />
        </ResizablePanel>
      )}
    </div>
  );
}

function Login() {
	const { isDarkMode } = useApp();
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
      <div 
        style={{ 
			width: '300px', 
			maxWidth: '100%',
			padding: '1.5rem',
			border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
			borderRadius: '8px',
			backgroundColor: 'var(--bg-secondary)'
        }}
      >
			<div style={{ width: '200px', margin: '0 auto', marginBottom: '2rem' }}>
			  <Logo className="w-full h-auto text-primary" />
			</div>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'var(--accent-color)',
                  brandAccent: 'var(--accent-color)',
                },
              },
              dark: {
                colors: {
                  brand: 'var(--accent-color)',
                  brandAccent: 'var(--accent-color)',
                  background: 'var(--bg-primary)',
                  text: 'var(--text-primary)',
                },
              },
            },
          }}
          providers={[]}
          theme={isDarkMode ? 'dark' : 'default'}
        />
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <TopBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/record"
          element={
            <ProtectedRoute>
              <AudioRecorder />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppProvider>
            <AppLayout />
          </AppProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}
