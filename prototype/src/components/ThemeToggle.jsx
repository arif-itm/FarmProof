import { useCallback, useEffect, useState } from 'react';

const LIGHT_CLASS = 'light';

export function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem('fp_theme') || 'dark');
    useEffect(() => {
        document.documentElement.classList.toggle(LIGHT_CLASS, theme === 'light');
        localStorage.setItem('fp_theme', theme);
    }, [theme]);
    const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
    return { theme, toggle };
}

export default function ThemeToggle() {
    const { theme, toggle } = useTheme();
    return (
        <button
            onClick={toggle}
            title="Toggle light/dark"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm transition-all cursor-pointer"
        >
            {theme === 'dark' ? '🌙' : '☀️'}
        </button>
    );
}
