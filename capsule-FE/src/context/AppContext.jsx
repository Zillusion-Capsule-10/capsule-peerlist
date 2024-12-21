/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext({});

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isTrackListVisible, setIsTrackListVisible] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  const toggleTrackList = () => {
    isMobileView && setIsTrackListVisible(!isTrackListVisible);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
  };

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      if (!isMobile) {
        setIsTrackListVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDarkMode ? 'dark' : 'light'
    );
  }, [isDarkMode]);

  const value = {
    selectedTrack,
    setSelectedTrack,
    isTrackListVisible,
    toggleTrackList,
    isMobileView,
    isDarkMode,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
