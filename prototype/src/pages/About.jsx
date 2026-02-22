import { Link } from 'react-router-dom';
import { useTheme } from '../components/PortalNavbar.jsx';

// ── Section heading component ──
function SectionTitle({ tag, title, sub }) {
    return (
        <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full uppercase tracking-wider mb-3">{tag}</span>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{title}</h2>
            {sub && <p className="text-gray-400 text-sm max-w-xl mx-auto">{sub}</p>}
        </div>
    );
}

// ── Flow step in architecture diagram ──
function FlowStep({ icon, label, sub, color = 'emerald', last = false }) {
    const colors = {
        emerald: { ring: 'border-emerald-500/40 bg-emerald-500/10', icon: 'text-emerald-400', line: 'bg-emerald-500/30' },
        blue: { ring: 'border-blue-500/40 bg-blue-500/10', icon: 'text-blue-400', line: 'bg-blue-500/30' },
        purple: { ring: 'border-purple-500/40 bg-purple-500/10', icon: 'text-purple-400', line: 'bg-purple-500/30' },
        amber: { ring: 'border-amber-500/40 bg-amber-500/10', icon: 'text-amber-400', line: 'bg-amber-500/30' },
        pink: { ring: 'border-pink-500/40 bg-pink-500/10', icon: 'text-pink-400', line: 'bg-pink-500/30' },
    };
    const c = colors[color];
    return (
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-2xl border ${c.ring} flex items-center justify-center text-xl flex-shrink-0`}>{icon}</div>
                {!last && <div className={`w-0.5 h-6 ${c.line} mt-1 hidden md:block`} />}
            </div>
            <div className="min-w-0">
                <div className={`text-sm font-bold ${c.icon}`}>{label}</div>
                <div className="text-xs text-gray-500 leading-snug">{sub}</div>
            </div>
            {!last && <div className="hidden md:block flex-shrink-0 text-gray-700 text-lg">→</div>}
        </div>
    );
}

const TECH = [
    { icon: '⛓', name: 'Polygon Amoy', role: 'L2 Blockchain', desc: 'EVM-compatible Layer 2 — ~2s finality, ~$0.001 gas per payout tx', color: 'text-purple-400' },
    { icon: '📜', name: 'Solidity Smart Contracts', role: 'On-Chain Logic', desc: 'FarmerRegistry.sol · InsurancePool.sol · OracleConsumer.sol', color: 'text-blue-400' },
    { icon: '🌦️', name: 'Open-Meteo API', role: 'Weather Oracle', desc: 'Free, open weather API — hourly rainfall, temperature, humidity', color: 'text-emerald-400' },
    { icon: '🛰️', name: 'Copernicus Sentinel-2', role: 'Satellite Oracle', desc: 'NDVI crop health index from ESA — 10m resolution, 5-day revisit', color: 'text-cyan-400' },
    { icon: '🌊', name: 'FFWC Bangladesh', role: 'Hydrological Oracle', desc: 'Flood Forecasting & Warning Centre — Surma River SUR-07 station', color: 'text-blue-400' },
    { icon: '📱', name: 'bKash MFS', role: 'Payment Rail', desc: 'Bangladesh\'s largest mobile financial service — 60M+ users', color: 'text-pink-400' },
    { icon: '⚛️', name: 'React + Vite', role: 'Frontend', desc: 'TypeScript-ready SPA with PWA support — offline-capable', color: 'text-sky-400' },
    { icon: '🗄️', name: 'Zustand + localStorage', role: 'State Persistence', desc: 'Lightweight state management with cross-tab sync simulation', color: 'text-amber-400' },
];

const METHODOLOGY_STEPS = [
    {
        n: '01', color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
        title: 'Parametric Index Design',
        desc: 'Unlike indemnity insurance (which requires loss assessment after the fact), FarmProof uses a parametric model: pre-defined measurable indices trigger automatic payouts without adjuster visits. Three indices are used: 72h cumulative rainfall (mm), NDVI satellite crop stress drop (%), and Surma River level (m). All three must simultaneously exceed thresholds to prevent false positives.',
        refs: ['Barnett & Mahul (2007) — Index insurance for weather risk', 'World Bank ARMT Toolkit — Parametric design principles'],
    },
    {
        n: '02', color: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
        title: 'Triple Oracle Consensus',
        desc: 'A single data source creates manipulation and failure risk. FarmProof uses a triple oracle architecture: one live API (Open-Meteo), one satellite index (Sentinel-2 NDVI via Copernicus), and one government hydrological gauge (FFWC SUR-07). A payout trigger only fires when all three sources independently exceed thresholds — providing cryptographic multi-source consensus before any funds move.',
        refs: ['Chainlink Oracle Design Patterns (2020)', 'Breidenbach et al. — Town Crier: Authenticated data feeds'],
    },
    {
        n: '03', color: 'border-purple-500/40 bg-purple-500/5 text-purple-400',
        title: 'Smart Contract Settlement',
        desc: 'The InsurancePool.sol contract holds the premium pool in escrow. When evaluateTrigger() receives validated oracle data and all three conditions are met, it iterates registered farmers and calls transfer() to each bKash-linked wallet automatically — no human intermediary, no paperwork. All state transitions are emitted as events, creating an immutable audit trail on Polygon.',
        refs: ['Ethereum EIP-20 Token Standard', 'Szabo (1997) — Formalizing and securing relationships on public networks'],
    },
    {
        n: '04', color: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
        title: 'GPS-Linked Policy Registration',
        desc: 'Each farmer registers with GPS coordinates (latitude/longitude) linking their land parcel to the specific oracle monitoring zone (Sunamganj haor region). Only farmers inside the affected geographical zone receive payouts when a flood triggers — preventing fraudulent cross-zone claims. Future implementation uses geohashing for polygon-level precision.',
        refs: ['FAO GeoNetwork — Agricultural land parcel management', 'Bangladesh DAE — Crop zone delineation methodology'],
    },
    {
        n: '05', color: 'border-pink-500/40 bg-pink-500/5 text-pink-400',
        title: 'Financial Inclusion via MFS',
        desc: 'Traditional insurance requires bank accounts, which 70%+ of Bangladeshi farmers lack. FarmProof routes payouts through bKash — Bangladesh\'s largest MFS with 60M+ users. Farmers pay premiums via bKash and receive payouts to the same wallet, eliminating the need for bank infrastructure while providing full traceability through the blockchain ledger.',
        refs: ['CGAP (2021) — Mobile money and financial inclusion in Bangladesh', 'Bangladesh Bank — Mobile Financial Services statistics 2024'],
    },
];

const SDGS = [
    {
        n: '1', label: 'No Poverty',
        desc: 'When a flood destroys a farmer\'s harvest, the family can fall into debt or poverty within weeks. FarmProof ensures automatic cash payouts reach the farmer\'s bKash wallet in under 72 hours — before the debt spiral begins.',
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
    {
        n: '2', label: 'Zero Hunger',
        desc: 'With no insurance, farmers who lose their crop often cannot afford to replant the next season. FarmProof\'s payout covers replanting costs, keeping farmers in agriculture and maintaining local food supply.',
        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    },
    {
        n: '13', label: 'Climate Action',
        desc: 'Bangladesh loses 1.7% of GDP annually to climate-driven floods. FarmProof builds parametric climate resilience — real-time satellite + rainfall + river monitoring triggers automatic safety nets when climate events hit, making communities financially resilient to worsening flood cycles driven by climate change.',
        color: 'text-green-400 bg-green-500/10 border-green-500/20',
    },
    {
        n: '9', label: 'Industry & Innovation',
        desc: 'FarmProof pioneers decentralised parametric insurance infrastructure — combining blockchain smart contracts, triple oracle consensus, and mobile money rails into a replicable DeFi model for climate risk in developing economies.',
        color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    },
];

export default function About() {
    const { theme, toggle } = useTheme();

    return (
        <div className="min-h-screen text-white">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-5 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl" style={{ height: 60 }}>
                <Link to="/" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </Link>
                <div className="w-px h-5 bg-gray-700" />
                <div className="flex items-center gap-2 font-black text-base">Farm<span className="text-emerald-400">Proof</span></div>
                <div className="flex-1" />
                <button onClick={toggle} title="Toggle light/dark"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm transition-all">
                    {theme === 'dark' ? '🌙' : '☀️'}
                </button>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">About</span>
            </nav>

            <main className="pt-20 pb-20 px-4 md:px-6 max-w-5xl mx-auto">

                {/* ── Hero ── */}
                <div className="text-center py-14 mb-4">
                    <h1 className="text-4xl md:text-5xl font-black leading-tight mb-3">
                        FarmProof<br />
                        <span className="text-emerald-400">Blockchain Parametric</span><br />
                        Crop Insurance
                    </h1>
                    <p className="text-lg font-semibold text-gray-300 italic mb-4">"When the Sky Breaks, the Code Pays"</p>
                    <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed mb-6">
                        A decentralised parametric flood insurance protocol for smallholder farmers in Sunamganj, Bangladesh — using a triple oracle consensus model and automatic on-chain payouts via bKash, eliminating claim forms, adjuster visits, and payment delays.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {[
                            ['Sunamganj, Bangladesh', '📍'],
                            ['Polygon Amoy Testnet', '⛓'],
                            ['Open Source Prototype', '🔓'],
                            ['Parametric Insurance', '📊'],
                        ].map(([l, i]) => (
                            <span key={l} className="text-xs text-gray-400 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-full font-medium">{i} {l}</span>
                        ))}
                    </div>
                </div>

                {/* ── Problem Statement ── */}
                <section className="mb-16">
                    <SectionTitle tag="Problem" title="The Crop Insurance Gap" sub="Why 98% of smallholder farmers in Bangladesh have no insurance coverage" />

                    {/* Before / After comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-lg">😔</span>
                                <h3 className="font-bold text-red-400">Without Insurance Today</h3>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    { icon: '🌊', text: 'Flood destroys the entire crop in days' },
                                    { icon: '📋', text: '6–9 months wait for a claim assessor to visit' },
                                    { icon: '🏦', text: 'Payout requires a bank account — 70%+ farmers have none' },
                                    { icon: '💔', text: 'Family takes loans, sells land, or leaves farming' },
                                    { icon: '🔄', text: 'Cycle repeats every flood season' },
                                ].map(i => (
                                    <li key={i.text} className="flex gap-3 text-sm text-gray-400">
                                        <span className="flex-shrink-0">{i.icon}</span>
                                        <span>{i.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-lg">✅</span>
                                <h3 className="font-bold text-emerald-400">With FarmProof</h3>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    { icon: '🌦️', text: 'Satellite + weather + river sensors detect the flood automatically' },
                                    { icon: '⚡', text: 'Smart contract triggers payout within 72 hours — no paperwork' },
                                    { icon: '📱', text: 'Money arrives directly to the farmer\'s bKash wallet' },
                                    { icon: '🌱', text: 'Farmer can afford to replant the next season' },
                                    { icon: '🔐', text: 'Every transaction recorded on-chain — fully transparent' },
                                ].map(i => (
                                    <li key={i.text} className="flex gap-3 text-sm text-gray-400">
                                        <span className="flex-shrink-0">{i.icon}</span>
                                        <span>{i.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Key stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { stat: '98%', label: 'Farmers uninsured in Bangladesh', color: 'text-red-400' },
                            { stat: '৳2,500 Cr+', label: 'Annual flood crop loss', color: 'text-orange-400' },
                            { stat: '72h', label: 'FarmProof payout time', color: 'text-emerald-400' },
                            { stat: '0', label: 'Claim forms required', color: 'text-blue-400' },
                        ].map(k => (
                            <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                                <div className={`text-xl font-black ${k.color} mb-1`}>{k.stat}</div>
                                <div className="text-xs text-gray-500 leading-snug">{k.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── System Architecture Flow ── */}
                <section className="mb-16">
                    <SectionTitle tag="Architecture" title="System Flow" sub="From farmer registration to automatic payout — end to end" />
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
                        {/* Row 1 */}
                        <div className="flex flex-wrap md:flex-nowrap items-start gap-4 mb-6 pb-6 border-b border-gray-800">
                            <FlowStep icon="👨‍🌾" label="Farmer Registers" sub="Submits name, bKash no., GPS coordinates, crop type, land area" color="emerald" />
                            <FlowStep icon="📜" label="FarmerRegistry.sol" sub="GPS + wallet stored on-chain · premium locked in pool" color="blue" />
                            <FlowStep icon="💳" label="Premium Paid via bKash" sub="৳800–2,800 one-time per season · immutable ledger entry" color="purple" />
                        </div>
                        {/* Row 2 */}
                        <div className="flex flex-wrap md:flex-nowrap items-start gap-4 mb-6 pb-6 border-b border-gray-800">
                            <FlowStep icon="🌦️" label="Open-Meteo API" sub="72h rainfall · 6-hourly fetch · Sunamganj coords" color="blue" />
                            <FlowStep icon="🛰️" label="Sentinel-2 NDVI" sub="Crop stress index · simulated Copernicus data" color="blue" />
                            <FlowStep icon="🌊" label="FFWC SUR-07 Gauge" sub="Surma River water level · danger mark threshold" color="blue" last />
                        </div>
                        {/* Row 3 */}
                        <div className="flex flex-wrap md:flex-nowrap items-start gap-4">
                            <FlowStep icon="🧠" label="evaluateTrigger()" sub="ALL 3 indices must exceed threshold simultaneously" color="amber" />
                            <FlowStep icon="⚡" label="Auto Payout Fires" sub="InsurancePool.sol transfers coverage to each wallet" color="pink" />
                            <FlowStep icon="📱" label="bKash Settlement" sub="৳25k–1L reaches farmer wallet · zero human intervention" color="emerald" last />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3"><span className="font-bold text-emerald-400 block text-sm">~2s</span>Block finality (Polygon)</div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3"><span className="font-bold text-blue-400 block text-sm">$0.001</span>Gas per payout tx</div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3"><span className="font-bold text-purple-400 block text-sm">0</span>Claim forms required</div>
                    </div>
                </section>

                {/* ── Methodology Framework ── */}
                <section className="mb-16">
                    <SectionTitle tag="Methodology" title="Research Framework" sub="Five interdependent design pillars, each grounded in academic literature" />
                    <div className="space-y-4">
                        {METHODOLOGY_STEPS.map(s => (
                            <div key={s.n} className={`border ${s.color} rounded-2xl p-5`}>
                                <div className="flex items-start gap-4">
                                    <div className={`text-3xl font-black ${s.color.split(' ')[2]} opacity-40 font-mono flex-shrink-0 leading-none pt-1`}>{s.n}</div>
                                    <div className="flex-1">
                                        <h3 className={`font-bold text-base mb-2 ${s.color.split(' ')[2]}`}>{s.title}</h3>
                                        <p className="text-sm text-gray-400 leading-relaxed mb-3">{s.desc}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {s.refs.map(r => (
                                                <span key={r} className="text-xs text-gray-600 bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full font-mono">{r}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Tech Stack ── */}
                <section className="mb-16">
                    <SectionTitle tag="Technology" title="Technical Stack" sub="Production-grade open-source components, each selected for specific blockchain insurance requirements" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {TECH.map(t => (
                            <div key={t.name} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 flex items-start gap-3 transition-colors">
                                <div className="text-2xl flex-shrink-0 mt-0.5">{t.icon}</div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`font-bold text-sm ${t.color}`}>{t.name}</span>
                                        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{t.role}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 leading-snug">{t.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Limitations & Future Work ── */}
                <section className="mb-16">
                    <SectionTitle tag="Scope" title="Limitations & Future Work" sub="Honest assessment of prototype boundaries vs. production requirements" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="font-bold text-red-400 mb-3">⚠ Current Prototype Scope</h3>
                            <ul className="space-y-2 text-sm text-gray-400">
                                {[
                                    'State persisted in localStorage — production requires database + Polygon Mainnet',
                                    'NDVI and river data are simulated (real APIs require institutional access)',
                                    'bKash integration is mocked — real MFS requires BFIU compliance and MOU',
                                    'No actual MATIC/crypto — demo uses simulated block numbers and tx hashes',
                                    'Single monitoring zone (Sunamganj) — production needs multi-district coverage',
                                ].map(l => <li key={l} className="flex gap-2"><span className="text-red-500 flex-shrink-0 mt-0.5">✗</span>{l}</li>)}
                            </ul>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="font-bold text-emerald-400 mb-3">🔭 Production Roadmap</h3>
                            <ul className="space-y-2 text-sm text-gray-400">
                                {[
                                    'Live Chainlink oracle integration for real-time, tamper-proof data feeds',
                                    'IDRA (Insurance Development & Regulatory Authority) compliance certification',
                                    'Copernicus WEKEO API integration for real Sentinel-2 NDVI data',
                                    'FFWC API access via Bangladesh Flood Partnership MOU',
                                    'Multi-signature admin governance for threshold changes (DAO pattern)',
                                    'Actuarial premium modelling using 30-year historical flood data (BWDB)',
                                ].map(l => <li key={l} className="flex gap-2"><span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>{l}</li>)}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── SDG Section ── */}
                <section className="mb-16">
                    <SectionTitle tag="Impact" title="UN Sustainable Development Goals" sub="FarmProof directly addresses four SDGs through deliberate technical design" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {SDGS.map(s => (
                            <div key={s.n} className={`border ${s.color} rounded-2xl p-5`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-2xl font-black ${s.color.split(' ')[0]} font-mono`}>#{s.n}</span>
                                    <span className="font-bold text-base text-white">{s.label}</span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Project Domain Tags ── */}
                <section className="mb-10">
                    <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
                        <div className="text-2xl mb-3">🔬</div>
                        <h3 className="font-black text-xl mb-2">Research Domains</h3>
                        <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed mb-5">
                            FarmProof sits at the intersection of blockchain engineering, climate science, and financial inclusion — combining academic research with practical open-source implementation.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {[
                                { l: 'Blockchain Engineering', c: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
                                { l: 'Parametric Insurance Design', c: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                                { l: 'Agro-Climate Data Science', c: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
                                { l: 'Financial Inclusion (FinTech)', c: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
                                { l: 'Smart Contract Development', c: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
                                { l: 'Climate Resilience', c: 'text-green-400 border-green-500/30 bg-green-500/10' },
                            ].map(x => (
                                <span key={x.l} className={`text-xs font-semibold border px-3 py-1.5 rounded-full ${x.c}`}>{x.l}</span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <div className="text-center">
                    <p className="text-gray-500 text-sm mb-4">Explore the live prototype</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link to="/" className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all">
                            ← Back to Portals
                        </Link>
                        <Link to="/farmer" className="border border-gray-700 hover:border-emerald-500/50 text-gray-300 hover:text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
                            Open Farmer Portal →
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
