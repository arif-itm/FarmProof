import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore.js';
import { blockchain } from '../../lib/blockchain.js';
import { fetchWeather, clearWeatherCache } from '../../lib/weather.js';
import { simulate, evaluate } from '../../lib/oracle.js';
import { useToastStore } from '../../components/Toast.jsx';
import PortalNavbar, { useLang } from '../../components/PortalNavbar.jsx';

const TIERS = { basic: { coverage: 25000, premium: 800 }, standard: { coverage: 50000, premium: 1500 }, premium: { coverage: 100000, premium: 2800 } };
const STRINGS = {
    en: {
        pageTitle: 'My Crop Insurance', pageDesc: 'Register crops, pay premiums, and monitor your coverage on Polygon blockchain.',
        tabPolicies: 'My Policies', tabRegister: '➕ New Policy', tabWeather: '🌤 Weather', tabPayouts: '⚡ Payouts',
        regFarmers: 'Registered Farmers', emptyTitle: 'No policies yet', emptyDesc: 'Register your first crop to get started',
        emptyBtn: 'Register Now →', poolLabel: 'Pool Balance', poolSub: 'Total premiums locked in smart contract',
        covLabel: 'Total Coverage', polLabel: 'Active Policies', poutLabel: 'Payouts Made', netLabel: 'Network',
        formTitle: 'New Insurance Policy', formDesc: 'All fields pre-filled for demo — just click Submit.',
        formHint: 'Form is pre-filled. Click', formHintBold: '"Register & Pay Premium"', formHintSuffix: 'to submit and see the blockchain transaction.',
        fName: 'Full Name *', fWallet: 'bKash Number *', fCrop: 'Crop Type *', fArea: 'Land Area *', fDate: 'Planting Date *', fTier: 'Coverage Tier *',
        summTitle: 'Policy Summary', summCov: 'Coverage Amount', summPrem: 'Premium (one-time)', summPay: 'Payment Method', summSet: 'Settlement',
        submitBtn: 'Register & Pay Premium on Blockchain',
        howTitle: 'How it works', how1: 'Register & pay', how1d: 'Crop details written to FarmerRegistry.sol · Premium locked in pool',
        how2: 'Oracle monitors 24/7', how2d: 'Weather + satellite NDVI + river level checked every 6 hours',
        how3: 'Flood detected → payout', how3d: 'Coverage sent to your bKash within 72h · Zero claim forms',
        location: 'Sunamganj, Sylhet', refreshBtn: 'Refresh',
        poutTitle: 'Payout History', noPoutTitle: 'No payouts yet', noPoutDesc: 'Go to the Oracle Engine portal and simulate a flash flood to trigger payouts.',
        paid: '⚡ Paid', active: '✓ Active', policies: 'policies', payouts: 'payouts',
        cropSelect: '— Select —',
        tierBasic: 'Basic — ৳25,000 (৳800/season)', tierStd: 'Standard — ৳50,000 (৳1,500/season)', tierPrem: 'Premium — ৳100,000 (৳2,800/season)',
    },
    bn: {
        pageTitle: 'আমার ফসল বীমা', pageDesc: 'ফসল নিবন্ধন করুন, প্রিমিয়াম পরিশোধ করুন এবং পলিগন ব্লকচেইনে আপনার কভারেজ পর্যবেক্ষণ করুন।',
        tabPolicies: 'আমার পলিসি', tabRegister: '➕ নতুন পলিসি', tabWeather: '🌤 আবহাওয়া', tabPayouts: '⚡ পেমেন্ট',
        regFarmers: 'নিবন্ধিত কৃষক', emptyTitle: 'এখনো কোনো পলিসি নেই', emptyDesc: 'শুরু করতে প্রথম ফসল নিবন্ধন করুন',
        emptyBtn: 'এখনই নিবন্ধন করুন →', poolLabel: 'পুল ব্যালেন্স', poolSub: 'স্মার্ট কন্ট্রাক্টে সংরক্ষিত মোট প্রিমিয়াম',
        covLabel: 'মোট কভারেজ', polLabel: 'সক্রিয় পলিসি', poutLabel: 'পেমেন্ট বিতরণ', netLabel: 'নেটওয়ার্ক',
        formTitle: 'নতুন বীমা পলিসি', formDesc: 'সকল তথ্য ডেমোর জন্য পূর্ব-পূরণ করা — শুধু সাবমিট ক্লিক করুন।',
        formHint: 'ফর্ম পূর্ব-পূরণ করা। ক্লিক করুন', formHintBold: '"নিবন্ধন ও প্রিমিয়াম পরিশোধ"', formHintSuffix: 'ব্লকচেইন লেনদেন দেখতে।',
        fName: 'পূর্ণ নাম *', fWallet: 'বিকাশ নম্বর *', fCrop: 'ফসলের ধরন *', fArea: 'জমির পরিমাণ *', fDate: 'রোপণের তারিখ *', fTier: 'কভারেজ স্তর *',
        summTitle: 'পলিসি সারসংক্ষেপ', summCov: 'কভারেজ পরিমাণ', summPrem: 'প্রিমিয়াম (একবার)', summPay: 'পেমেন্ট পদ্ধতি', summSet: 'নিষ্পত্তি',
        submitBtn: 'ব্লকচেইনে নিবন্ধন ও প্রিমিয়াম পরিশোধ করুন',
        howTitle: 'এটি কীভাবে কাজ করে', how1: 'নিবন্ধন ও পরিশোধ', how1d: 'ফসলের তথ্য FarmerRegistry.sol তে লেখা · প্রিমিয়াম পুলে সংরক্ষিত',
        how2: 'ওরাকল ২৪/৭ পর্যবেক্ষণ', how2d: 'আবহাওয়া + ধানি NDVI + নদীর মাত্রা প্রতি ৬ ঘণ্টায় পরীক্ষা',
        how3: 'বন্যা শনাক্ত → পেমেন্ট', how3d: '৭২ ঘন্টার মধ্যে আপনার বিকাশে পাঠানো হবে · কোনো দাবি ফর্ম লাগবে না',
        location: 'সুনামগঞ্জ, সিলেট', refreshBtn: 'রিফ্রেশ',
        poutTitle: 'পেমেন্টের ইতিহাস', noPoutTitle: 'এখনো কোনো পেমেন্ট নেই', noPoutDesc: 'বন্যা ট্রিগার করতে ওরাকল ইঞ্জিন পোর্টালে যান।',
        paid: '⚡ পরিশোধিত', active: '✓ সক্রিয়', policies: 'পলিসি', payouts: 'পেমেন্ট',
        cropSelect: '— বেছে নিন —',
        tierBasic: 'সাধারণ — ৳২৫,০০০ (৳৮০০/মৌসুম)', tierStd: 'স্ট্যান্ডার্ড — ৳৫০,০০০ (৳১,৫০০/মৌসুম)', tierPrem: 'প্রিমিয়াম — ৳১,০০,০০০ (৳২,৮০০/মৌসুম)',
    }
};

// Default form values for demo prefill
const DEFAULT_FORM = {
    name: 'Md. Abdul Karim', wallet: '01712345678', crop: 'Boro Rice', area: '4.5', unit: 'bigha',
    lat: '25.0700', lon: '91.0000', planted: '2025-12-10', tier: 'standard',
};

function buildWCard(icon, label, val, unit, thresh, pct, status, cls) {
    const bgs = { ok: 'border-gray-700', warn: 'border-amber-500/40', alert: 'border-red-500/50' };
    const colors = { ok: 'text-white', warn: 'text-amber-400', alert: 'text-red-400' };
    const bar = { ok: 'bg-emerald-500', warn: 'bg-amber-500', alert: 'bg-red-500' };
    return { icon, label, val, unit, thresh, pct, status, cls, bgs, colors, bar };
}

export default function FarmerPortal() {
    const store = useStore();
    const showToast = useToastStore(s => s.show);
    const { lang, toggle: toggleLang } = useLang();
    const T = k => STRINGS[lang][k] || STRINGS.en[k] || k;

    const [tab, setTab] = useState('policies');
    const [form, setForm] = useState({ ...DEFAULT_FORM });
    const [selectedTier, setSelectedTier] = useState('standard');
    const [txCard, setTxCard] = useState(null);
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [weatherData, setWeatherData] = useState(null);
    const [oracleData, setOracleData] = useState(null);
    const [wTime, setWTime] = useState('');

    // Load weather when weather tab opened
    useEffect(() => {
        if (tab === 'weather') loadWeather();
    }, [tab]);

    async function loadWeather() {
        setWeatherData(null);
        setOracleData(null);
        const w = await fetchWeather();
        setWeatherData(w);
        store.setWeatherData(w);
        const d = simulate(store.floodSimulated, w);
        setOracleData(d);
        setWTime((w.source === 'Fallback' ? '⚠ Offline — ' : '✓ Live · ') + new Date().toLocaleTimeString());
    }

    function handleRegister(e) {
        e.preventDefault();
        const { name, wallet, crop, area, unit, lat, lon, planted, tier } = form;
        if (!name || !wallet || !crop || !area || !planted) {
            showToast('Please fill all required fields', 'error'); return;
        }
        const t = TIERS[tier] || TIERS.standard;
        const farmer = {
            id: Date.now(), name, wallet, crop, area: parseFloat(area), unit,
            lat: parseFloat(lat), lon: parseFloat(lon), planted, tier,
            coverage: t.coverage, premium: t.premium,
            address: blockchain.randomHex(40), registeredAt: new Date(), paid: false,
        };
        store.registerFarmer(farmer);
        const entry = blockchain.addEntry('registration', name, `Registered ${crop} · ${area} ${unit} · GPS(${lat},${lon})`);
        blockchain.addEntry('premium', name, `Premium paid ৳${t.premium.toLocaleString()} · Locked in contract pool`);
        setTxCard({ farmer, entry, t });
        showToast(`✅ ${name} registered on Polygon! Saved to localStorage`, 'success');
        // Prefill next demo
        setTimeout(() => setForm({ name: 'Rina Begum', wallet: '01812345679', crop: 'Mustard', area: '2.5', unit: 'katha', lat: '25.0700', lon: '91.0000', planted: '2025-12-10', tier: 'basic' }), 200);
    }

    const payouts = store.ledger.filter(e => e.type === 'payout');

    const wCards = oracleData ? (() => {
        const t = store.thresholds, d = oracleData;
        const s = (v, th) => v > th ? 'alert' : v > th * .75 ? 'warn' : 'ok';
        return [
            buildWCard('🌧️', '72h Rainfall', d.rainfall.toFixed(1), 'mm', `Trigger > ${t.rainfall}mm`, Math.min((d.rainfall / t.rainfall) * 100, 100), d.rainfall > t.rainfall ? '⚠ Threshold exceeded!' : d.rainfall > t.rainfall * .75 ? '⬆ Approaching limit' : '✓ Normal', s(d.rainfall, t.rainfall)),
            buildWCard('🛰️', 'NDVI Drop', d.ndvi.toFixed(1), '%', `Trigger > ${t.ndvi}%`, Math.min((d.ndvi / t.ndvi) * 100, 100), d.ndvi > t.ndvi ? '⚠ Threshold exceeded!' : '✓ Healthy crops', s(d.ndvi, t.ndvi)),
            buildWCard('🌊', 'River Level', d.river.toFixed(2), 'm', `Danger > ${t.river}m`, Math.min((d.river / t.river) * 100, 100), d.river > t.river ? '⚠ Above danger mark!' : d.river > t.river * .85 ? '⬆ Rising fast' : '✓ Below danger mark', s(d.river, t.river)),
            buildWCard('🌡️', 'Temperature', d.temp?.toFixed(1) || '—', '°C', 'Reference only', Math.min(((d.temp || 28) / 40) * 100, 100), '✓ Normal', 'ok'),
            buildWCard('💧', 'Humidity', (d.humidity || '—') + '', '%', 'Reference only', d.humidity || 0, '✓ Normal', 'ok'),
            buildWCard('🌬️', 'Wind Speed', d.wind?.toFixed(1) || '—', 'km/h', 'Reference only', Math.min(((d.wind || 0) / 60) * 100, 100), '✓ Normal', 'ok'),
        ];
    })() : [];

    const tabs = [
        { id: 'policies', label: T('tabPolicies') },
        { id: 'register', label: T('tabRegister') },
        { id: 'weather', label: T('tabWeather') },
        { id: 'payouts', label: T('tabPayouts') },
    ];

    return (
        <div className="min-h-screen text-white">
            <PortalNavbar
                portalLabel={lang === 'bn' ? 'লাইভ · কৃষক পোর্টাল' : 'Live · Farmer Portal'}
                portalColor="emerald"
                showLangToggle={true}
                lang={lang}
                onLangToggle={toggleLang}
                isLive={true}
            />

            <main className="pt-20 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-black mb-1">{T('pageTitle')}</h1>
                    <p className="text-gray-400 text-sm">{T('pageDesc')}</p>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
                    {tabs.map((t, i) => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`tab-btn flex-1 min-w-max py-2 px-4 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'active bg-gray-800 text-white' : 'text-gray-400'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── MY POLICIES TAB ── */}
                {tab === 'policies' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 slide-up">
                        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-lg">{T('regFarmers')}</h2>
                                <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                                    {store.farmers.length} {T('policies')}
                                </span>
                            </div>
                            {store.farmers.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-3">🌾</div>
                                    <div className="font-semibold text-gray-300 mb-1">{T('emptyTitle')}</div>
                                    <div className="text-sm text-gray-500 mb-4">{T('emptyDesc')}</div>
                                    <button onClick={() => setTab('register')}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-5 py-2 rounded-xl text-sm transition-colors">
                                        {T('emptyBtn')}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    {store.farmers.map(f => (
                                        <div key={f.id} onClick={() => setSelectedFarmer(selectedFarmer?.id === f.id ? null : f)}
                                            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all mb-2 slide-up ${f.paid ? 'border-blue-500/30 bg-blue-500/5' : 'border-gray-800 hover:border-emerald-500/40 hover:bg-gray-800/40'}`}>
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center font-black text-gray-950 text-base flex-shrink-0">
                                                {f.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate">{f.name}</div>
                                                <div className="text-xs text-gray-400 truncate">{f.crop} · {f.area} {f.unit || 'Bigha'} · {f.tier} tier</div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className={`text-xs font-bold ${f.paid ? 'text-blue-400' : 'text-emerald-400'}`}>{f.paid ? T('paid') : T('active')}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">৳{f.coverage?.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedFarmer && (
                                        <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-5 mt-4 slide-up">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-bold text-lg">{selectedFarmer.name}</h3>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${selectedFarmer.paid ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                                    {selectedFarmer.paid ? '⚡ Payout Executed' : '✓ Active Coverage'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {[
                                                    ['Crop', selectedFarmer.crop],
                                                    ['Land', `${selectedFarmer.area} ${selectedFarmer.unit || 'Bigha'}`],
                                                    ['Coverage', `৳${selectedFarmer.coverage?.toLocaleString()}`],
                                                    ['Premium', `৳${selectedFarmer.premium?.toLocaleString()}`],
                                                    ['Planted', selectedFarmer.planted],
                                                    ['bKash', selectedFarmer.wallet],
                                                    ['GPS', `${selectedFarmer.lat}°N, ${selectedFarmer.lon}°E`],
                                                    ['Registered', new Date(selectedFarmer.registeredAt).toLocaleDateString()],
                                                    ...(selectedFarmer.paid && selectedFarmer.payoutTx ? [['Payout TxHash', selectedFarmer.payoutTx.slice(0, 12) + '…']] : []),
                                                ].map(([k, v]) => (
                                                    <div key={k} className="bg-gray-800/60 rounded-xl p-3">
                                                        <div className="text-xs text-gray-500 mb-1">{k}</div>
                                                        <div className="text-sm font-semibold break-all">{v}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-5">
                                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">{T('poolLabel')}</div>
                                <div className="text-3xl font-black text-emerald-400 mb-1">৳{store.poolBalance.toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mb-3">{T('poolSub')}</div>
                                <div className="bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(store.poolBalance / 2000, 100)}%` }} />
                                </div>
                                <div className="flex justify-between text-xs text-gray-600 mt-1"><span>৳0</span><span>৳200,000 target</span></div>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">{T('covLabel')}</span><span className="font-bold">৳{store.totalCoverage.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">{T('polLabel')}</span><span className="font-bold">{store.farmers.length}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">{T('poutLabel')}</span><span className="font-bold">{store.payoutCount}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">{T('netLabel')}</span><span className="font-bold text-emerald-400">Polygon Amoy</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── REGISTER TAB ── */}
                {tab === 'register' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 slide-up">
                        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="font-bold text-lg">{T('formTitle')}</h2>
                                    <p className="text-sm text-gray-400 mt-0.5">{T('formDesc')}</p>
                                </div>
                                <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full">UC1 · UC2</span>
                            </div>
                            <div className="flex items-start gap-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 mb-5 text-sm">
                                <span className="text-emerald-400 mt-0.5">💡</span>
                                <span className="text-emerald-300">{T('formHint')} <strong>{T('formHintBold')}</strong> {T('formHintSuffix')}</span>
                            </div>
                            <form onSubmit={handleRegister} className="space-y-4" noValidate>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{T('fName')}</label>
                                        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all" type="text" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{T('fWallet')}</label>
                                        <input value={form.wallet} onChange={e => setForm(p => ({ ...p, wallet: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all" type="tel" maxLength={11} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{T('fCrop')}</label>
                                        <select value={form.crop} onChange={e => setForm(p => ({ ...p, crop: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all">
                                            <option value="">{T('cropSelect')}</option>
                                            {['Boro Rice', 'Aman Rice', 'Mustard', 'Jute', 'Wheat'].map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{T('fArea')}</label>
                                        <div className="flex gap-2">
                                            <input value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} type="number" min="0.01" step="0.01" placeholder="e.g. 4.5"
                                                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all" />
                                            <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                                                className="bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all flex-shrink-0">
                                                {['sqft', 'katha', 'bigha', 'acre', 'kani', 'shotok'].map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">GPS Latitude</label>
                                        <input value={form.lat} onChange={e => setForm(p => ({ ...p, lat: e.target.value }))} type="number" step="0.0001"
                                            className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">GPS Longitude</label>
                                        <input value={form.lon} onChange={e => setForm(p => ({ ...p, lon: e.target.value }))} type="number" step="0.0001"
                                            className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{T('fDate')}</label>
                                        <input value={form.planted} onChange={e => setForm(p => ({ ...p, planted: e.target.value }))} type="date"
                                            className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{T('fTier')}</label>
                                        <select value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all">
                                            <option value="basic">{T('tierBasic')}</option>
                                            <option value="standard">{T('tierStd')}</option>
                                            <option value="premium">{T('tierPrem')}</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Summary */}
                                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-sm">
                                    <div className="font-semibold text-gray-300 mb-2">{T('summTitle')}</div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between"><span className="text-gray-400">{T('summCov')}</span><span className="font-bold text-emerald-400">৳{(TIERS[form.tier] || TIERS.standard).coverage.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">{T('summPrem')}</span><span className="font-bold">৳{(TIERS[form.tier] || TIERS.standard).premium.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">{T('summPay')}</span><span className="font-bold text-pink-400">📱 bKash</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">{T('summSet')}</span><span className="font-bold text-emerald-400">⚡ Instant (on-chain)</span></div>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-gray-950 font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                    {T('submitBtn')}
                                </button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            {txCard && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 slide-up">
                                    <div className="text-center mb-4">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-xl text-gray-950 font-black mx-auto mb-3 pop-in">✓</div>
                                        <h3 className="font-bold text-base text-emerald-400">Registered on Blockchain!</h3>
                                        <p className="text-xs text-gray-400 mt-1">Written to FarmerRegistry.sol · Saved to localStorage</p>
                                    </div>
                                    <div className="bg-gray-900/60 rounded-xl p-3 font-mono text-xs space-y-1.5">
                                        {[
                                            ['Status', '✓ Confirmed on Polygon'], ['Block', `#${txCard.entry.block?.toLocaleString()}`],
                                            ['Farmer', txCard.farmer.name], ['Crop', `${txCard.farmer.crop} · ${txCard.farmer.area} ${txCard.farmer.unit}`],
                                            ['Coverage', `৳${txCard.t.coverage.toLocaleString()}`], ['Premium', `৳${txCard.t.premium.toLocaleString()}`],
                                            ['TxHash', txCard.entry.txHash?.slice(0, 16) + '…'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between gap-2">
                                                <span className="text-gray-500">{k}</span>
                                                <span className="text-emerald-400 text-right break-all">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setTab('policies')} className="w-full mt-3 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-semibold py-2 rounded-xl text-xs transition-colors">
                                        View My Policies →
                                    </button>
                                </div>
                            )}
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                                <h3 className="font-bold mb-4">{T('howTitle')}</h3>
                                <div className="space-y-4">
                                    {[{ n: '1', t: T('how1'), d: T('how1d') }, { n: '2', t: T('how2'), d: T('how2d') }, { n: '3', t: T('how3'), d: T('how3d') }].map(s => (
                                        <div key={s.n} className="flex gap-3">
                                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0 mt-0.5">{s.n}</div>
                                            <div>
                                                <span className="font-semibold text-sm">{s.t}</span>
                                                <div className="text-xs text-gray-400 mt-0.5">{s.d}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── WEATHER TAB ── */}
                {tab === 'weather' && (
                    <div className="slide-up">
                        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 dot-pulse" />
                                <span className="font-semibold">{T('location')}</span>
                                <span className="text-sm text-gray-400">25.07°N, 91.00°E</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {wTime && <span className="text-xs text-gray-500">{wTime}</span>}
                                <button onClick={() => { clearWeatherCache(); loadWeather(); }}
                                    className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    {T('refreshBtn')}
                                </button>
                            </div>
                        </div>
                        {!oracleData ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                {Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="bg-gray-900 border border-gray-700 rounded-2xl p-4 animate-pulse"><div className="h-24 bg-gray-800 rounded-xl" /></div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                {wCards.map(c => (
                                    <div key={c.label} className={`bg-gray-900 border ${c.bgs[c.cls]} rounded-2xl p-4 transition-all`}>
                                        <div className="text-xl mb-1">{c.icon}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{c.label}</div>
                                        <div className={`text-2xl font-black ${c.colors[c.cls]} mb-0.5`}>{c.val}<span className="text-sm font-normal text-gray-500 ml-1">{c.unit}</span></div>
                                        <div className="text-xs text-gray-600 mb-2">{c.thresh}</div>
                                        <div className="bg-gray-700 rounded-full h-1 overflow-hidden mb-1.5"><div className={`${c.bar[c.cls]} h-full rounded-full`} style={{ width: `${c.pct}%` }} /></div>
                                        <div className={`text-xs font-semibold ${c.colors[c.cls]}`}>{c.status}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-200">
                            <strong className="text-white">Data sources:</strong> Rainfall from{' '}
                            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-400">Open-Meteo</a>{' '}
                            (live). NDVI from simulated Sentinel-2. River level from simulated FFWC (Surma, SUR-07, Sunamganj).
                        </div>
                    </div>
                )}

                {/* ── PAYOUTS TAB ── */}
                {tab === 'payouts' && (
                    <div className="slide-up">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-lg">{T('poutTitle')}</h2>
                                <span className="text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-full">
                                    {payouts.length} {T('payouts')}
                                </span>
                            </div>
                            {payouts.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-3">⚡</div>
                                    <div className="font-semibold text-gray-300 mb-1">{T('noPoutTitle')}</div>
                                    <div className="text-sm text-gray-500">{T('noPoutDesc')}</div>
                                </div>
                            ) : payouts.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-3 slide-up">
                                    <div className="text-2xl">⚡</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-emerald-400">৳{(p.amount || 50000).toLocaleString()}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">{p.data}</div>
                                    </div>
                                    <div className="text-right text-xs text-gray-400">
                                        {new Date(p.timestamp).toLocaleDateString()}<br />
                                        {new Date(p.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
