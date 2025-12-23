import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check for saved theme preference or use system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme;
      
      // Check for system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark'; // Default to dark theme
  });

  // Toggle between light and dark theme
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  // Set CSS variables based on theme
  useEffect(() => {
    // Set theme class on document element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Set CSS variables for colors
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--color-background', '#0E1116');
      root.style.setProperty('--color-background-elevated', '#151A21');
      root.style.setProperty('--color-background-subtle', '#1A1F26');
      root.style.setProperty('--color-primary', '#3E7BFF');
      root.style.setProperty('--color-primary-light', '#5B8CFF');
      root.style.setProperty('--color-primary-dark', '#2A5FD1');
      root.style.setProperty('--color-accent', '#2EC4B6');
      root.style.setProperty('--color-accent-light', '#3ED6C2');
      root.style.setProperty('--color-accent-dark', '#1FA396');
      root.style.setProperty('--color-text-primary', '#E6EAF0');
      root.style.setProperty('--color-text-secondary', '#A0AEC0');
      root.style.setProperty('--color-text-tertiary', '#718096');
      root.style.setProperty('--color-border', '#252E3A');
      root.style.setProperty('--color-border-light', '#2D3748');
      root.style.setProperty('--color-error', '#F56565');
      root.style.setProperty('--color-warning', '#F59E0B');
      root.style.setProperty('--color-success', '#48BB78');
      root.style.setProperty('--color-info', '#4299E1');
    } else {
      root.style.setProperty('--color-background', '#FFFFFF');
      root.style.setProperty('--color-background-elevated', '#F8FAFC');
      root.style.setProperty('--color-background-subtle', '#F1F5F9');
      root.style.setProperty('--color-primary', '#3E7BFF');
      root.style.setProperty('--color-primary-light', '#5B8CFF');
      root.style.setProperty('--color-primary-dark', '#2A5FD1');
      root.style.setProperty('--color-accent', '#2EC4B6');
      root.style.setProperty('--color-accent-light', '#3ED6C2');
      root.style.setProperty('--color-accent-dark', '#1FA396');
      root.style.setProperty('--color-text-primary', '#1A202C');
      root.style.setProperty('--color-text-secondary', '#4A5568');
      root.style.setProperty('--color-text-tertiary', '#718096');
      root.style.setProperty('--color-border', '#E2E8F0');
      root.style.setProperty('--color-border-light', '#CBD5E0');
      root.style.setProperty('--color-error', '#E53E3E');
      root.style.setProperty('--color-warning', '#DD6B20');
      root.style.setProperty('--color-success', '#38A169');
      root.style.setProperty('--color-info', '#3182CE');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
