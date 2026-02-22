import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import { blockchain } from '../../lib/blockchain.js';
import { useToastStore } from '../../components/Toast.jsx';
import PortalNavbar from '../../components/PortalNavbar.jsx';

const DEFAULT = { rainfall: 200, ndvi: 40, river: 8.5 };

export default function AdminPortal() {
    const store = useStore();
    const showToast = useToastStore(s => s.show);

    // Slider local state (mirrors original admin.html sliders)
    const [rainfall, setRainfall] = useState(store.thresholds.rainfall ?? 200);
    const [ndvi, setNdvi] = useState(store.thresholds.ndvi ?? 40);
    const [river, setRiver] = useState(store.thresholds.river ?? 8.5);
    const [coverage, setCoverage] = useState(50000);
    const [interval, setInterval_] = useState(6);
    const [saveMsg, setSaveMsg] = useState('');
    const [adminTxs, setAdminTxs] = useState([]);
    const [lastUpdated, setLastUpdated] = useState('Never');

    function sliderGrad(val, min, max) {
        const pct = ((val - min) / (max - min)) * 100;
        return `linear-gradient(90deg,#10b981 ${pct}%,#374151 ${pct}%)`;
    }

    function save() {
        const newThresholds = { rainfall, ndvi, river };
        store.setThresholds(newThresholds);
        const entry = blockchain.addEntry('oracle', 'Admin',
            `Thresholds updated: rain=${rainfall}mm ndvi=${ndvi}% river=${river}m interval=${interval}h`);
        const now = new Date().toLocaleTimeString();
        setLastUpdated(now);
        setSaveMsg(`✓ Saved at block #${entry.block?.toLocaleString()} · ${now}`);
        setAdminTxs(prev => [{ rainfall, ndvi, river, interval, entry }, ...prev]);
        showToast('✅ Thresholds saved & broadcast to all portals', 'success');
    }

    function resetAll() {
        if (!window.confirm('Reset ALL data in localStorage?\nAll portals will instantly clear. This cannot be undone.')) return;
        store.resetState();
        setAdminTxs([]);
        setSaveMsg('');
        setLastUpdated('Never');
        setRainfall(DEFAULT.rainfall);
        setNdvi(DEFAULT.ndvi);
        setRiver(DEFAULT.river);
        setCoverage(50000);
        setInterval_(6);
        showToast('🔄 All data cleared · localStorage reset · All portals notified', 'success');
    }

    return (
        <div className="min-h-screen text-white">
            <PortalNavbar portalLabel="Live · Admin Portal" portalColor="amber" isLive={true} />

            <main className="pt-20 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-black mb-1">Contract Configuration</h1>
                    <p className="text-gray-400 text-sm">
                        Adjust trigger thresholds and coverage settings. All changes persist to{' '}
                        <code className="font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded text-xs">localStorage</code>{' '}
                        and broadcast live to all open portals.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* LEFT: Settings */}
                    <div className="space-y-5">
                        {/* Trigger thresholds */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="font-bold">Trigger Thresholds</h2>
                                <span className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2.5 py-1 rounded-full">Critical · Oracle uses these</span>
                            </div>

                            {/* Rainfall slider */}
                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold">🌧️ 72-Hour Rainfall Threshold</label>
                                    <span className="font-mono font-bold text-emerald-400 text-sm">{rainfall} mm</span>
                                </div>
                                <input type="range" min="100" max="400" step="10" value={rainfall}
                                    onChange={e => setRainfall(Number(e.target.value))}
                                    className="w-full appearance-none h-1.5 rounded-full outline-none cursor-pointer"
                                    style={{ background: sliderGrad(rainfall, 100, 400) }} />
                                <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                                    <span>100mm (very sensitive)</span><span>400mm (extreme only)</span>
                                </div>
                            </div>

                            {/* NDVI slider */}
                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold">🛰️ NDVI Drop Threshold</label>
                                    <span className="font-mono font-bold text-emerald-400 text-sm">{ndvi} %</span>
                                </div>
                                <input type="range" min="20" max="80" step="5" value={ndvi}
                                    onChange={e => setNdvi(Number(e.target.value))}
                                    className="w-full appearance-none h-1.5 rounded-full outline-none cursor-pointer"
                                    style={{ background: sliderGrad(ndvi, 20, 80) }} />
                                <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                                    <span>20% (sensitive)</span><span>80% (severe loss only)</span>
                                </div>
                            </div>

                            {/* River Level slider */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold">🌊 River Level Threshold</label>
                                    <span className="font-mono font-bold text-emerald-400 text-sm">{river} m</span>
                                </div>
                                <input type="range" min="5" max="15" step="0.5" value={river}
                                    onChange={e => setRiver(Number(e.target.value))}
                                    className="w-full appearance-none h-1.5 rounded-full outline-none cursor-pointer"
                                    style={{ background: sliderGrad(river, 5, 15) }} />
                                <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                                    <span>5m (very sensitive)</span><span>15m (extreme flood only)</span>
                                </div>
                            </div>
                        </div>

                        {/* Coverage & Operations */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h2 className="font-bold mb-5">Coverage &amp; Operations</h2>

                            <div className="mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold">💰 Standard Coverage Amount</label>
                                    <span className="font-mono font-bold text-emerald-400 text-sm">৳{coverage.toLocaleString()}</span>
                                </div>
                                <input type="range" min="10000" max="200000" step="5000" value={coverage}
                                    onChange={e => setCoverage(Number(e.target.value))}
                                    className="w-full appearance-none h-1.5 rounded-full outline-none cursor-pointer"
                                    style={{ background: sliderGrad(coverage, 10000, 200000) }} />
                                <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                                    <span>৳10,000</span><span>৳200,000</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold">⏱️ Oracle Fetch Interval</label>
                                    <span className="font-mono font-bold text-emerald-400 text-sm">{interval} {interval === 1 ? 'hour' : 'hours'}</span>
                                </div>
                                <input type="range" min="1" max="24" step="1" value={interval}
                                    onChange={e => setInterval_(Number(e.target.value))}
                                    className="w-full appearance-none h-1.5 rounded-full outline-none cursor-pointer"
                                    style={{ background: sliderGrad(interval, 1, 24) }} />
                                <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                                    <span>1h (near real-time)</span><span>24h (daily)</span>
                                </div>
                            </div>
                        </div>

                        {/* Save button */}
                        <button onClick={save}
                            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-black py-3 rounded-xl text-sm transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            Save &amp; Broadcast to All Portals
                        </button>
                        {saveMsg && <div className="text-xs text-emerald-400 font-semibold text-center mt-1">{saveMsg}</div>}

                        {/* Danger zone */}
                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                            <h3 className="font-bold text-red-400 mb-1">⚠️ Demo Reset</h3>
                            <p className="text-sm text-gray-400 mb-1">
                                Clears ALL session data in{' '}
                                <code className="font-mono text-amber-400 text-xs">localStorage</code>{' '}
                                and resets to a fresh empty state.
                            </p>
                            <p className="text-xs text-gray-500 mb-4">All open portals (Farmer, Oracle, Insurer) will instantly update.</p>
                            <button onClick={resetAll}
                                className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                                🗑️ Reset All Data — Clear localStorage
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: Live contract state + tx log */}
                    <div className="space-y-5">
                        {/* Live contract state */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold">Live Contract State</h2>
                                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">localStorage</span>
                            </div>

                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Deployment</div>
                            <div className="space-y-2 mb-5 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">Contract</span><span className="font-mono text-xs text-gray-500">0x7B4a3f…3Fc2</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Network</span><span className="font-semibold text-emerald-400">Polygon Amoy</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Current Block</span><span className="font-mono font-bold">#{store.blockNumber?.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Oracle Address</span><span className="font-mono text-xs text-gray-500">0xOracle…F1a9</span></div>
                            </div>

                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Thresholds</div>
                            <div className="space-y-2 mb-5 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">🌧️ Rainfall</span><span className="font-bold">{store.thresholds.rainfall} mm</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">🛰️ NDVI Drop</span><span className="font-bold">{store.thresholds.ndvi} %</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">🌊 River Level</span><span className="font-bold">{store.thresholds.river} m</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">⏱ Oracle Interval</span><span className="font-bold">{interval} {interval === 1 ? 'hour' : 'hours'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Last Updated</span><span className="font-bold text-gray-400">{lastUpdated}</span></div>
                            </div>

                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pool Statistics</div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">Pool Balance</span><span className="font-bold text-emerald-400">৳{store.poolBalance.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Active Policies</span><span className="font-bold">{store.farmers.length}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Total Coverage</span><span className="font-bold">৳{store.totalCoverage.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Payouts Made</span><span className="font-bold">{store.payoutCount}</span></div>
                            </div>
                        </div>

                        {/* Admin transactions log */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold">Admin Transactions</h2>
                                <span className="text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">{adminTxs.length} txs</span>
                            </div>
                            {adminTxs.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-3xl mb-2">📋</div>
                                    <div className="text-sm text-gray-500">No transactions yet.<br />Save thresholds to generate one.</div>
                                </div>
                            ) : adminTxs.map((tx, i) => (
                                <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-3.5 mb-3 slide-up">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">THRESHOLD UPDATE</span>
                                        <span className="font-mono text-xs text-gray-500">Block #{tx.entry?.block?.toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                                        {[['Rainfall', `${tx.rainfall}mm`], ['NDVI', `${tx.ndvi}%`], ['River', `${tx.river}m`]].map(([k, v]) => (
                                            <div key={k} className="bg-gray-900 rounded-lg p-2 text-center">
                                                <div className="text-xs text-gray-500">{k}</div>
                                                <div className="font-bold text-sm">{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="font-mono text-xs text-gray-500 truncate">TxHash: {tx.entry?.txHash?.slice(0, 20)}…</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
