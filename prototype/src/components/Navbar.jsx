import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

const PORTALS = [
    { to: '/farmer', label: 'Farmer', color: 'emerald' },
    { to: '/oracle', label: 'Oracle', color: 'blue' },
    { to: '/insurer', label: 'Insurer', color: 'purple' },
    { to: '/admin', label: 'Admin', color: 'amber' },
];

const COLOR_MAP = {
    emerald: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    blue: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    purple: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    amber: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
};

export default function Navbar({ portalColor = 'emerald' }) {
    const { pathname } = useLocation();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-5 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl" style={{ height: 60 }}>
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-black text-lg text-white hover:text-emerald-400 transition-colors">
                <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                    <polygon points="14,2 26,9 26,21 14,28 2,21 2,9" stroke="#10b981" strokeWidth="2" fill="none" />
                    <circle cx="14" cy="16" r="3.5" fill="#10b981" />
                </svg>
                Farm<span className="text-emerald-400">Proof</span>
            </Link>

            {/* Portal links */}
            <div className="hidden md:flex items-center gap-1 ml-4">
                {PORTALS.map(p => (
                    <Link
                        key={p.to}
                        to={p.to}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${pathname.startsWith(p.to)
                                ? COLOR_MAP[p.color] + ' border'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {p.label}
                    </Link>
                ))}
            </div>

            <div className="flex-1" />

            <ThemeToggle />

            {/* Network badge */}
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 dot-pulse" />
                Polygon Amoy Testnet
            </div>
        </nav>
    );
}
