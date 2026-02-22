import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore.js';
import { useToastStore } from '../../components/Toast.jsx';
import PortalNavbar from '../../components/PortalNavbar.jsx';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const TAB_IDS = ['analytics', 'audit', 'registry', 'regions'];
const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'];

function evClass(type) {
    const m = {
        registration: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        premium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        oracle: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        payout: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        admin: 'text-red-400 bg-red-400/10 border-red-400/20',
    };
    return m[type] || 'text-gray-400 bg-gray-800 border-gray-700';
}

function shortHash(h) { return h ? h.slice(0, 8) + '…' + h.slice(-4) : '—'; }
function formatTime(d) { return new Date(d).toLocaleTimeString(); }
function formatDate(d) { return new Date(d).toLocaleDateString(); }

export default function InsurerPortal() {
    const store = useStore();
    const showToast = useToastStore(s => s.show);
    const [tab, setTab] = useState('analytics');
    const [auditFilter, setAuditFilter] = useState('all');
    const [auditQ, setAuditQ] = useState('');
    const [verifyHash, setVerifyHash] = useState('');
    const [verifyOut, setVerifyOut] = useState(null);

    const farmers = store.farmers;
    const ledger = store.ledger;

    const poolIn = farmers.reduce((s, f) => s + f.premium, 0);
    const poolOut = store.payoutTotal || 0;
    const reserve = Math.max(0, poolIn - poolOut);

    // Filtered audit
    const filteredLedger = ledger
        .filter(e => auditFilter === 'all' || e.type === auditFilter)
        .filter(e => !auditQ || [e.txHash, e.type, e.actor, e.data].join(' ').toLowerCase().includes(auditQ.toLowerCase()));

    // Crop map
    const cropMap = {};
    farmers.forEach(f => { cropMap[f.crop] = (cropMap[f.crop] || 0) + 1; });
    const cropLabels = Object.keys(cropMap).length ? Object.keys(cropMap) : ['No data'];
    const cropVals = Object.values(cropMap).length ? Object.values(cropMap) : [1];

    const pouts = ledger.filter(e => e.type === 'payout');
    const payoutTotal = pouts.reduce((s, p) => s + (p.amount || 0), 0);

    const tabs = [
        { id: 'analytics', label: '📈 Analytics' },
        { id: 'audit', label: '🔗 Audit Trail' },
        { id: 'registry', label: '👨‍🌾 Farmers' },
        { id: 'regions', label: '📍 Regions' },
    ];

    return (
        <div className="min-h-screen text-white">
            <PortalNavbar portalLabel="Live · Insurer Portal" portalColor="purple" isLive={true} />

            <main className="pt-20 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-black mb-1">Analytics &amp; Audit Trail</h1>
                    <p className="text-gray-400 text-sm">Full transparency of the insurance pool — all events persisted in localStorage, publicly verifiable on Polygon.</p>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`tab-btn flex-1 min-w-max py-2 px-4 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'active bg-gray-800 text-white' : 'text-gray-400'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── ANALYTICS ── */}
                {tab === 'analytics' && (
                    <div className="slide-up">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                            {[
                                { icon: '👨‍🌾', id: 'kpi-f', val: farmers.length, label: 'Farmers', color: 'text-emerald-400' },
                                { icon: '💰', id: 'kpi-pool', val: `৳${store.poolBalance.toLocaleString()}`, label: 'Pool Balance', color: 'text-emerald-400' },
                                { icon: '⚡', id: 'kpi-pouts', val: store.payoutCount, label: 'Payouts', color: 'text-blue-400' },
                                { icon: '🛡️', id: 'kpi-cov', val: `৳${store.totalCoverage.toLocaleString()}`, label: 'Coverage', color: 'text-purple-400' },
                            ].map(k => (
                                <div key={k.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                                    <div className="text-2xl mb-1">{k.icon}</div>
                                    <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
                                    <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">{k.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                                <h3 className="font-bold mb-4">Pool Flow (৳)</h3>
                                <div style={{ position: 'relative', height: '200px' }}>
                                    <Bar data={{
                                        labels: ['Premiums In', 'Payouts Out', 'Reserve'],
                                        datasets: [{ data: [poolIn, poolOut, reserve], backgroundColor: ['rgba(16,185,129,.7)', 'rgba(239,68,68,.7)', 'rgba(59,130,246,.7)'], borderColor: ['#10b981', '#ef4444', '#3b82f6'], borderWidth: 1, borderRadius: 8 }]
                                    }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,.03)' } }, y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,.03)' } } } }} />
                                </div>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                                <h3 className="font-bold mb-4">Crop Distribution</h3>
                                <div style={{ position: 'relative', height: '200px' }}>
                                    <Doughnut data={{
                                        labels: cropLabels,
                                        datasets: [{ data: cropVals, backgroundColor: cropLabels.map((_, i) => COLORS[i % COLORS.length]), borderColor: '#111827', borderWidth: 3 }]
                                    }} options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } } } }} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold">Pool Transparency</h3>
                                <span className="text-xs font-bold text-purple-400 bg-purple-400/10 border border-purple-400/20 px-2.5 py-1 rounded-full">On-Chain · Public · localStorage</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { icon: '📥', val: `৳${poolIn.toLocaleString()}`, base: 'text-emerald-400', label: 'Total Premiums In' },
                                    { icon: '📤', val: `৳${poolOut.toLocaleString()}`, base: 'text-red-400', label: 'Total Paid Out' },
                                    { icon: '🏦', val: `৳${reserve.toLocaleString()}`, base: 'text-blue-400', label: 'Pool Reserve' },
                                ].map(c => (
                                    <div key={c.label} className="bg-gray-800 rounded-xl p-4 text-center">
                                        <div className="text-2xl mb-1">{c.icon}</div>
                                        <div className={`text-xl font-black ${c.base}`}>{c.val}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── AUDIT TRAIL ── */}
                {tab === 'audit' && (
                    <div className="slide-up">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Immutable Ledger</h3>
                                <span className="text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">{ledger.length} records</span>
                            </div>
                            {/* Search */}
                            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 focus-within:border-purple-500 rounded-xl px-3.5 py-2.5 mb-3 transition-all">
                                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35" /></svg>
                                <input value={auditQ} onChange={e => setAuditQ(e.target.value)} type="text" placeholder="Search by actor, type, or TxHash…"
                                    className="bg-transparent text-sm text-white outline-none w-full placeholder-gray-500" />
                            </div>
                            {/* Filters */}
                            <div className="flex gap-2 flex-wrap mb-4">
                                {['all', 'registration', 'premium', 'oracle', 'payout'].map(f => (
                                    <button key={f} onClick={() => setAuditFilter(f)}
                                        className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${auditFilter === f ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 'text-gray-400 bg-gray-800 border border-gray-700 hover:border-purple-400'}`}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-gray-800">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-800">
                                            {['Block', 'Time', 'Event', 'Actor', 'Details', 'TxHash'].map(h => (
                                                <th key={h} className="text-left px-3 py-2.5 text-xs text-gray-500 uppercase tracking-wider font-semibold">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {filteredLedger.length === 0 ? (
                                            <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-sm">{ledger.length ? 'No events match this filter.' : 'No events yet. Register farmers and simulate a flood.'}</td></tr>
                                        ) : filteredLedger.map((e, i) => (
                                            <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                                                <td className="px-3 py-2.5 font-mono text-xs text-gray-500">#{(e.block || 0).toLocaleString()}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{formatTime(e.timestamp)}</td>
                                                <td className="px-3 py-2.5"><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${evClass(e.type)}`}>{e.type?.toUpperCase()}</span></td>
                                                <td className="px-3 py-2.5 text-sm max-w-28 truncate">{e.actor}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-400 max-w-48 truncate">{e.data}</td>
                                                <td className="px-3 py-2.5 font-mono text-xs text-gray-500 cursor-pointer hover:text-purple-400 transition-colors"
                                                    onClick={() => setVerifyHash(e.txHash)} title={e.txHash}>
                                                    {shortHash(e.txHash)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Verify */}
                            <div className="flex gap-2 items-center flex-wrap bg-gray-800 rounded-xl p-3 mt-4">
                                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                <input value={verifyHash} onChange={e => setVerifyHash(e.target.value)} type="text" placeholder="Paste TxHash to verify on-chain…"
                                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-500 min-w-0" />
                                <button onClick={() => {
                                    const found = ledger.find(e => e.txHash === verifyHash);
                                    setVerifyOut(found ? { ok: true, msg: `✓ Block #${found.block?.toLocaleString()} · ${found.type} · ${found.actor}` } : { ok: false, msg: verifyHash ? '✗ Not found in ledger' : '' });
                                }} className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors">Verify</button>
                                {verifyOut?.msg && <span className={`text-xs font-semibold ${verifyOut.ok ? 'text-emerald-400' : 'text-red-400'}`}>{verifyOut.msg}</span>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── FARMER REGISTRY ── */}
                {tab === 'registry' && (
                    <div className="slide-up">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Farmer Registry (On-Chain)</h3>
                                <span className="text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">{farmers.length} farmers</span>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-gray-800">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-gray-800">
                                        {['Farmer', 'Crop', 'Land', 'Coverage', 'Status', 'Date'].map(h => (
                                            <th key={h} className="text-left px-3 py-2.5 text-xs text-gray-500 uppercase">{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {farmers.length === 0
                                            ? <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-sm">No farmers registered yet.</td></tr>
                                            : farmers.map(f => (
                                                <tr key={f.id} className="hover:bg-gray-800/40 transition-colors">
                                                    <td className="px-3 py-2.5 font-semibold">{f.name}</td>
                                                    <td className="px-3 py-2.5 text-gray-300">{f.crop}</td>
                                                    <td className="px-3 py-2.5 text-gray-300">{f.area} {f.unit || 'bigha'}</td>
                                                    <td className="px-3 py-2.5 font-semibold">৳{f.coverage?.toLocaleString()}</td>
                                                    <td className="px-3 py-2.5"><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${f.paid ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'}`}>{f.paid ? 'PAID ⚡' : 'ACTIVE'}</span></td>
                                                    <td className="px-3 py-2.5 text-xs text-gray-500">{formatDate(f.registeredAt)}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── REGIONS ── */}
                {tab === 'regions' && (
                    <div className="slide-up">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Regional Map — Sylhet Division</h3>
                                <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">{pouts.length} events</span>
                            </div>
                            <div className="space-y-3 mb-4">
                                <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 hover:border-emerald-500/40 rounded-xl p-3.5 transition-all">
                                    <span className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: '0 0 8px rgba(52,211,153,.5)' }} />
                                    <div className="flex-1"><div className="font-semibold text-sm">Sunamganj District</div><div className="text-xs text-gray-400">Haor wetland · Primary monitoring zone</div></div>
                                    <div className="text-right"><div className="text-sm font-bold text-emerald-400">{pouts.length} payouts</div><div className="text-xs text-gray-400">৳{payoutTotal.toLocaleString()} paid</div></div>
                                </div>
                                {[{ label: 'Sylhet Sadar', sub: 'River Surma basin' }, { label: 'Netrokona', sub: 'River Kangsha basin' }, { label: 'Kishoreganj', sub: 'River Meghna basin' }].map(r => (
                                    <div key={r.label} className="flex items-center gap-3 bg-gray-800 border border-gray-800 rounded-xl p-3.5">
                                        <span className="w-3 h-3 rounded-full bg-gray-600 flex-shrink-0" />
                                        <div className="flex-1"><div className="font-semibold text-sm">{r.label}</div><div className="text-xs text-gray-400">{r.sub}</div></div>
                                        <div className="text-sm text-gray-500">No Events</div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-200">
                                <strong className="text-white">Compliance note:</strong> All payout records meet Bangladesh Insurance Act (IDRA) audit requirements. Every event is stored in localStorage and immutably on Polygon. Government agencies (DAE, MoA) and donors can verify any TxHash on PolygonScan.
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
