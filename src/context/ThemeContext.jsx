import React, { useEffect, useState } from 'react';
import ThemeContext from './theme-context';


export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('theme');
        if (stored) return stored;
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
