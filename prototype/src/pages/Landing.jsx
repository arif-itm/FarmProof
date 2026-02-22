import { Link } from 'react-router-dom';
import BlockchainCanvas from '../components/BlockchainCanvas.jsx';
import { useTheme } from '../components/PortalNavbar.jsx';

const PORTALS = [
    {
        to: '/farmer', emoji: '👨‍🌾', title: 'Farmer Portal',
        desc: 'Register your crop, pay premium, check live weather, and track payouts.',
        badge: 'Register · Pay · Track',
        hoverBorder: 'hover:border-emerald-500/40',
        hoverShadow: 'hover:shadow-emerald-500/10',
        iconBg: 'bg-emerald-500/10 border-emerald-500/20',
        badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    },
    {
        to: '/oracle', emoji: '🌐', title: 'Oracle Engine',
        desc: 'Live weather + satellite + river data. Trigger the automatic flood payout.',
        badge: 'Monitor · Trigger · Execute',
        hoverBorder: 'hover:border-blue-500/40',
        hoverShadow: 'hover:shadow-blue-500/10',
        iconBg: 'bg-blue-500/10 border-blue-500/20',
        badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    },
    {
        to: '/insurer', emoji: '📊', title: 'Insurer / Government',
        desc: 'Analytics, audit trail, farmer registry — all publicly verifiable on-chain.',
        badge: 'Analytics · Audit · Verify',
        hoverBorder: 'hover:border-purple-500/40',
        hoverShadow: 'hover:shadow-purple-500/10',
        iconBg: 'bg-purple-500/10 border-purple-500/20',
        badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    },
    {
        to: '/admin', emoji: '⚙️', title: 'System Admin',
        desc: 'Configure trigger thresholds and coverage settings without redeploying.',
        badge: 'Configure · Manage',
        hoverBorder: 'hover:border-amber-500/40',
        hoverShadow: 'hover:shadow-amber-500/10',
        iconBg: 'bg-amber-500/10 border-amber-500/20',
        badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    },
];

export default function Landing() {
    const { theme, toggle } = useTheme();
    const isLight = theme === 'light';

    return (
        <div className="min-h-screen text-white">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-5 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl" style={{ height: 60 }}>
                <div className="flex items-center gap-2 font-black text-lg">
                    <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                        <polygon points="14,2 26,9 26,21 14,28 2,21 2,9" stroke="#10b981" strokeWidth="2" fill="none" />
                        <circle cx="14" cy="16" r="3.5" fill="#10b981" />
                    </svg>
                    Farm<span className="text-emerald-400">Proof</span>
                </div>
                <div className="flex-1" />
                <Link to="/about" className="text-xs font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all">
                    About
                </Link>
                <button onClick={toggle} title="Toggle light/dark"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm transition-all">
                    {isLight ? '☀️' : '🌙'}
                </button>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 dot-pulse" />
                    Polygon Amoy Testnet
                </div>
            </nav>

            {/* Hero */}
            <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
                <div className="absolute inset-0">
                    <BlockchainCanvas />
                </div>
                <div className="relative z-10 text-center px-4 max-w-3xl mx-auto py-16 slide-up">

                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-4 py-1.5 rounded-full mb-6">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 dot-pulse" />
                        Sunamganj, Sylhet, Bangladesh
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-3">
                        Flood Insurance That<br />
                        <span className="text-emerald-400 glow-emerald">Pays Itself</span>
                    </h1>

                    <p className="text-lg md:text-xl font-semibold text-gray-300 italic mb-4">
                        "When the Sky Breaks, the Code Pays"
                    </p>

                    <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                        Smart contracts monitor weather 24/7. When floods hit, payouts reach your bKash wallet automatically — no claim forms, no delays, no middlemen.
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap justify-center gap-4 mb-10">
                        {[['72h', 'Max Payout Time'], ['৳1L', 'Max Coverage / Policy'], ['0', 'Claim Forms Required']].map(([v, l]) => (
                            <div key={l} className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-3 text-center">
                                <div className="text-2xl font-black text-emerald-400">{v}</div>
                                <div className="text-xs text-gray-400 mt-1">{l}</div>
                            </div>
                        ))}
                    </div>

                    <p className="text-sm text-gray-500 mb-4">Choose your role to enter the system</p>

                    {/* Portal cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        {PORTALS.map(p => (
                            <Link
                                key={p.to} to={p.to}
                                className={`group bg-gray-900 hover:bg-gray-800 border border-gray-800 ${p.hoverBorder} rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${p.hoverShadow} block`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-11 h-11 rounded-xl ${p.iconBg} border flex items-center justify-center text-xl`}>
                                        {p.emoji}
                                    </div>
                                    <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-300 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                                <div className="font-bold text-base mb-1">{p.title}</div>
                                <div className="text-sm text-gray-400 mb-3">{p.desc}</div>
                                <span className={`text-xs font-semibold ${p.badgeColor} border px-2.5 py-0.5 rounded-full`}>{p.badge}</span>
                            </Link>
                        ))}
                    </div>

                    {/* SDG badges */}
                    <div className="flex flex-wrap justify-center gap-2 mt-8">
                        <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full font-semibold">SDG 1 · No Poverty</span>
                        <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full font-semibold">SDG 2 · Zero Hunger</span>
                        <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full font-semibold">SDG 13 · Climate Action</span>
                        <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full font-semibold">SDG 9 · Industry &amp; Innovation</span>
                    </div>
                </div>
            </section>
        </div >
    );
}
