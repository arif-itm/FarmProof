import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// ── Theme hook (uses html.light class like the original prototype) ──
export function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem('fp_theme') || 'dark');

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    function applyTheme(t) {
        const root = document.documentElement;
        if (t === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
        } else {
            root.classList.remove('light');
            root.classList.add('dark');
        }
        localStorage.setItem('fp_theme', t);
    }

    function toggle() {
        setTheme(t => {
            const next = t === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            return next;
        });
    }

    return { theme, toggle };
}

// ── Language hook ──
export function useLang() {
    const [lang, setLang] = useState(() => localStorage.getItem('fp_lang') || 'en');
    function toggle() {
        setLang(l => {
            const next = l === 'en' ? 'bn' : 'en';
            localStorage.setItem('fp_lang', next);
            return next;
        });
    }
    return { lang, setLang, toggle };
}

// ── Portal Navbar ──
// portalColor: accent color for the live badge
// showLangToggle: only farmer portal has this
export default function PortalNavbar({ portalLabel, portalColor = 'emerald', showLangToggle = false, lang, onLangToggle, isLive = true }) {
    const { theme, toggle: toggleTheme } = useTheme();
    const location = useLocation();

    const badgeColors = {
        emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    };
    const dotColors = {
        emerald: 'bg-emerald-400', blue: 'bg-blue-400', purple: 'bg-purple-400', amber: 'bg-amber-400',
    };

    return (
        <nav className="fixed top-0 inset-x-0 z-50 flex items-center gap-2 px-4 md:px-5 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl" style={{ height: '60px' }}>
            {/* Back */}
            <Link to="/" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </Link>
            <div className="w-px h-5 bg-gray-700" />
            <div className="flex items-center gap-2 font-black text-base">Farm<span className="text-emerald-400">Proof</span></div>
            <div className="flex-1" />

            {/* Language toggle — only farmer portal */}
            {showLangToggle && (
                <button onClick={onLangToggle}
                    className="text-xs font-bold border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition-all">
                    {lang === 'en' ? 'বাংলা' : 'English'}
                </button>
            )}

            {/* Theme toggle */}
            <button onClick={toggleTheme} title="Toggle light/dark"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm transition-all">
                {theme === 'dark' ? '🌙' : '☀️'}
            </button>

            {/* Live badge */}
            <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${isLive ? badgeColors[portalColor] : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                <span className={`w-2 h-2 rounded-full dot-pulse ${isLive ? dotColors[portalColor] : 'bg-gray-500'}`} />
                {isLive ? `Live · ${portalLabel}` : 'Connecting…'}
            </div>
        </nav>
    );
}
