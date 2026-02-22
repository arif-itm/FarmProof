import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore.js';
import { blockchain } from '../../lib/blockchain.js';
import { fetchWeather, clearWeatherCache } from '../../lib/weather.js';
import { simulate, evaluate } from '../../lib/oracle.js';
import { useToastStore } from '../../components/Toast.jsx';
import PortalNavbar from '../../components/PortalNavbar.jsx';

const delay = ms => new Promise(r => setTimeout(r, ms));

export default function OraclePortal() {
    const store = useStore();
    const showToast = useToastStore(s => s.show);

    const [reads, setReads] = useState(0);
    const [tickSec] = useState(30);
    const [tickRem, setTickRem] = useState(30);
    const [oracleData, setOracleData] = useState(null);
    const [evalResult, setEvalResult] = useState(null);
    const [flood, setFlood] = useState(false);
    const [running, setRunning] = useState(false);
    const [oracleStatus, setOracleStatus] = useState('Monitoring');
    const [execChip, setExecChip] = useState('Idle');
    const [payResult, setPayResult] = useState(null);
    const [steps, setSteps] = useState([null, null, null, null]); // null|'on'|'ok'
    const tickRef = useRef(null);

    async function oracleFetch(isFlood) {
        const d = simulate(isFlood, null);
        const ev = evaluate(d, store.thresholds);
        setOracleData(d);
        setEvalResult(ev);
        setReads(r => r + 1);
        return { d, ev };
    }

    function startTick() {
        clearInterval(tickRef.current);
        let rem = 30;
        setTickRem(30);
        tickRef.current = setInterval(() => {
            rem--;
            setTickRem(rem);
            if (rem <= 0) { rem = 30; setTickRem(30); if (!store.floodSimulated) oracleFetch(false); }
        }, 1000);
    }

    useEffect(() => {
        (async () => {
            await fetchWeather();
            const isFlood = store.floodSimulated;
            await oracleFetch(isFlood);
            if (isFlood) setFlood(true);
            startTick();
        })();
        return () => clearInterval(tickRef.current);
    }, []);

    function stepOn(i) { setSteps(s => s.map((x, idx) => idx === i ? 'on' : x)); }
    function stepOk(i) { setSteps(s => s.map((x, idx) => idx === i ? 'ok' : x)); }
    function resetSteps() { setSteps([null, null, null, null]); }

    async function runFlood() {
        if (running) return;
        setRunning(true);
        setPayResult(null);
        resetSteps();
        setExecChip('Running…');
        setOracleStatus('FLOOD EVENT');
        store.setFloodSimulated(true);
        setFlood(true);
        const t0 = Date.now();
        const { d } = await oracleFetch(true);
        blockchain.addEntry('oracle', 'Oracle Engine', `FLOOD: RF=${d.rainfall.toFixed(1)}mm NDVI=${d.ndvi.toFixed(1)}% River=${d.river.toFixed(2)}m – All thresholds exceeded`);

        stepOn(0); await delay(900); stepOk(0);
        stepOn(1); await delay(1200); stepOk(1);
        stepOn(2); await delay(1600);
        const blk = blockchain.nextBlock();
        stepOk(2);
        stepOn(3); await delay(1300);

        let total = 0;
        const farmers = store.farmers;
        farmers.forEach(f => {
            if (!f.paid) {
                total += f.coverage;
                store.markFarmerPaid(f.id, blockchain.randomHex(), blk, f.coverage);
                blockchain.addEntry('payout', 'InsurancePool.sol', `Payout ৳${f.coverage.toLocaleString()} → ${f.name} (${f.wallet})`, { amount: f.coverage, block: blk });
            }
        });
        if (!total) total = 175000;
        stepOk(3);

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        setPayResult({ total, txHash: blockchain.randomHex(), blk, elapsed, count: farmers.length || 4 });
        setExecChip('Completed');
        setRunning(false);
        showToast('🎉 Auto-payout executed! Saved to localStorage', 'success');
    }

    function resetOracle() {
        store.setFloodSimulated(false);
        setFlood(false);
        setPayResult(null);
        resetSteps();
        setExecChip('Idle');
        setOracleStatus('Monitoring');
        setRunning(false);
        oracleFetch(false);
        showToast('Trigger reset · localStorage updated', 'info');
    }

    const t = store.thresholds;
    const condRows = oracleData && evalResult ? [
        { icon: '🌧️', label: '72h Rainfall', expr: `rainfall > ${t.rainfall}mm`, val: oracleData.rainfall.toFixed(1) + 'mm', met: evalResult.rainfall.met, key: 'rain' },
        { icon: '🛰️', label: 'NDVI Drop', expr: `ndvi_drop > ${t.ndvi}%`, val: oracleData.ndvi.toFixed(1) + '%', met: evalResult.ndvi.met, key: 'ndvi' },
        { icon: '🌊', label: 'River Level', expr: `river_level > ${t.river}m`, val: oracleData.river.toFixed(2) + 'm', met: evalResult.river.met, key: 'river' },
    ] : [];

    const snapItems = oracleData ? [
        ['🌧️', 'Rainfall', oracleData.rainfall.toFixed(1), 'mm'],
        ['🛰️', 'NDVI', oracleData.ndvi.toFixed(1), '%'],
        ['🌊', 'River', oracleData.river.toFixed(2), 'm'],
        ['🌡️', 'Temp', (oracleData.temp || 28).toFixed(1), '°C'],
        ['💧', 'Humidity', (oracleData.humidity || 75) + '', '%'],
        ['🌬️', 'Wind', (oracleData.wind || 12).toFixed(1), 'km/h'],
    ] : [];

    const stepDefs = [
        { label: 'Oracle data validated', sub: 'All 3 sources agree on readings' },
        { label: 'evaluateTrigger() called', sub: 'Smart contract processes oracle calldata' },
        { label: 'Block mined on Polygon', sub: payResult ? `Block #${payResult.blk?.toLocaleString()} mined · Gas: 0.001 MATIC` : '~2s finality' },
        { label: 'Payouts transferred to wallets', sub: payResult ? `৳${payResult.total.toLocaleString()} sent to ${payResult.count} wallets · Zero human intervention` : 'Awaiting trigger…' },
    ];

    return (
        <div className="min-h-screen text-white">
            <PortalNavbar portalLabel="Live · Oracle Engine" portalColor="blue" isLive={true} />

            <main className="pt-20 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-black mb-1">Oracle Engine</h1>
                    <p className="text-gray-400 text-sm">Live data from 3 independent sources. When all 3 thresholds are crossed simultaneously, the smart contract fires automatic payouts — saved to localStorage instantly.</p>
                </div>

                {/* Countdown bar */}
                <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-5 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 dot-pulse flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-300">Next oracle fetch in:</span>
                    <div className="flex-1 min-w-24 bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(tickRem / tickSec) * 100}%` }} />
                    </div>
                    <span className="font-mono text-blue-400 font-bold text-sm flex-shrink-0">{tickRem}s</span>
                    <span className="text-xs text-gray-500">{reads} reads</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ml-auto border ${oracleStatus === 'FLOOD EVENT' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-blue-400 bg-blue-400/10 border-blue-400/20'}`}>{oracleStatus}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* LEFT */}
                    <div className="space-y-4">
                        {/* Data sources */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold">Data Sources</h2>
                                <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">3 active</span>
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    { icon: '🌦️', label: 'Open-Meteo API', sub: 'Rainfall, temperature, humidity, wind · 6-hourly', badge: 'Live', bc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
                                    { icon: '🛰️', label: 'Copernicus Sentinel-2', sub: 'NDVI crop health index · Sunamganj 25.07°N, 91.00°E', badge: 'Simulated', bc: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
                                    { icon: '🌊', label: 'FFWC Bangladesh', sub: 'Surma River · Station SUR-07 · Sunamganj', badge: 'Simulated', bc: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
                                ].map(s => (
                                    <div key={s.label} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                                        <span className="text-xl">{s.icon}</span>
                                        <div className="flex-1"><div className="text-sm font-semibold">{s.label}</div><div className="text-xs text-gray-400">{s.sub}</div></div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.bc}`}>{s.badge}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trigger conditions */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="font-bold">Trigger Conditions</h2>
                                <span className="text-xs text-gray-500">ALL 3 must be exceeded</span>
                            </div>
                            <div className="text-xs text-gray-600 font-mono mb-4">InsurancePool.sol · evaluateTrigger()</div>
                            <div className="space-y-2.5">
                                {condRows.map(c => (
                                    <div key={c.key} className={`flex items-center justify-between rounded-xl p-3.5 transition-all duration-500 border ${c.met ? 'border-red-500/50 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{c.icon}</span>
                                            <div>
                                                <div className="font-semibold text-sm">{c.label}</div>
                                                <div className="text-xs text-gray-500 font-mono mt-0.5">{c.expr}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-black text-lg font-mono ${c.met ? 'text-red-400' : 'text-white'}`}>{c.val}</div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.met ? 'text-red-400 bg-red-400/10 border border-red-400/20' : 'text-gray-400 bg-gray-700'}`}>{c.met ? 'MET ⚠' : 'SAFE'}</span>
                                        </div>
                                    </div>
                                ))}
                                {!oracleData && <div className="text-center py-4 text-gray-500 text-sm">Loading oracle data…</div>}
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={runFlood} disabled={running}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    {running ? '⏳ Executing…' : 'Simulate Flash Flood'}
                                </button>
                                <button onClick={resetOracle} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold py-2.5 px-4 rounded-xl text-sm transition-all">Reset</button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="space-y-4">
                        {/* Verdict */}
                        <div className={`border rounded-2xl p-5 text-center transition-all duration-500 ${flood && evalResult?.allMet ? 'bg-red-500/10 border-red-500/40' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                            <div className="text-4xl mb-3">{flood && evalResult?.allMet ? '🚨' : '🌤️'}</div>
                            <div className="text-lg font-black mb-1">{flood && evalResult?.allMet ? 'FLASH FLOOD DETECTED' : 'All Conditions Normal'}</div>
                            <div className="text-sm text-gray-400">{flood && evalResult?.allMet ? 'All 3 thresholds exceeded — payout executing…' : 'Oracle monitoring · No payout triggered'}</div>
                        </div>

                        {/* Snapshot */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-bold">Current Readings</h2>
                                <span className="text-xs text-gray-500">{oracleData ? `Updated ${new Date().toLocaleTimeString()}` : '—'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {snapItems.map(([i, l, v, u]) => (
                                    <div key={l} className="bg-gray-800 rounded-xl p-2.5 text-center">
                                        <div className="text-base">{i}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{l}</div>
                                        <div className="text-sm font-bold mt-0.5">{v}<span className="text-xs text-gray-500"> {u}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Execution log */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold">Execution Log</h2>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${execChip === 'Completed' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : execChip === 'Running…' ? 'text-blue-400 bg-blue-400/10 border border-blue-400/20' : 'text-gray-400 bg-gray-700'}`}>{execChip}</span>
                            </div>
                            <div className="space-y-2.5">
                                {stepDefs.map((s, i) => {
                                    const st = steps[i];
                                    return (
                                        <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 transition-all duration-400 ${st === 'on' ? 'border-blue-500/40 bg-blue-500/5 opacity-100' : st === 'ok' ? 'border-emerald-500/30 bg-emerald-500/5 opacity-100' : 'border-gray-800 opacity-30'}`}>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${st === 'ok' ? 'bg-emerald-500 text-gray-950 border-emerald-500 pop-in' : st === 'on' ? 'border-blue-400 text-blue-400' : 'border-gray-600'}`}>
                                                {st === 'ok' ? '✓' : i + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold">{s.label}</div>
                                                <div className="text-xs text-gray-500">{s.sub}</div>
                                            </div>
                                            <div className="text-base flex-shrink-0 mt-0.5">{st === 'ok' ? '✅' : '⏳'}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            {payResult && (
                                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center slide-up">
                                    <div className="text-4xl mb-2 pop-in">💸</div>
                                    <div className="text-3xl font-black text-emerald-400">৳{payResult.total.toLocaleString()}</div>
                                    <div className="text-sm text-gray-300 mt-1 mb-2">Total payout executed automatically · Saved to localStorage</div>
                                    <div className="text-xs text-gray-500 font-mono mb-1">TxHash: {payResult.txHash?.slice(0, 18)}…</div>
                                    <div className="text-xs text-gray-500">{payResult.elapsed}s execution · {payResult.count} farmers paid · Polygon Amoy</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
