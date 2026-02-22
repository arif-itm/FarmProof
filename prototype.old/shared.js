/* ═══════════════════════════════════════════════════════════
   FarmProof — shared.js
   All portal data lives in demoDatabase.json on the server.
   AppState.init() loads it once; all writes go to /api/db.
   SSE at /api/events pushes every change to every open tab.
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────── DEFAULTS ── */
const DB_DEFAULTS = {
    farmers: [],
    ledger: [],
    blockNumber: 19_400_000,
    poolBalance: 0,
    totalCoverage: 0,
    payoutCount: 0,
    payoutTotal: 0,
    thresholds: { rainfall: 200, ndvi: 40, river: 8.5 },
    floodSimulated: false,
};

/* ─────────────────────── STATE EVENTS (pub/sub) ── */
const StateEvents = {
    _h: {},
    on(type, fn) {
        if (!this._h[type]) this._h[type] = [];
        this._h[type].push(fn);
    },
    emit(type, payload) {
        (this._h[type] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
        (this._h['*'] || []).forEach(fn => { try { fn(type, payload); } catch (e) { } });
    },
};

/* ─────────────────────── APP STATE ── */
const AppState = (() => {
    // Single in-memory object — kept in sync with demoDatabase.json via SSE
    const _s = Object.assign({}, JSON.parse(JSON.stringify(DB_DEFAULTS)));

    let _sse = null;
    let _ready = false;
    let _saveTimer = null;

    /* Re-hydrate Date objects after JSON parse */
    function hydrate(obj) {
        (obj.ledger || []).forEach(e => { if (!(e.timestamp instanceof Date)) e.timestamp = new Date(e.timestamp); });
        (obj.farmers || []).forEach(f => { if (!(f.registeredAt instanceof Date)) f.registeredAt = new Date(f.registeredAt); });
    }

    /* Merge server state into local _s */
    function merge(incoming) {
        Object.assign(_s, incoming);
        hydrate(_s);
    }

    /* Fire-and-forget save to server + optional SSE broadcast */
    function save(eventType = null, payload = {}) {
        // Tidy up dates before sending
        const body = JSON.stringify({ state: _s, eventType, payload });
        fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        }).catch(err => console.warn('[AppState] save failed:', err.message));
    }

    /* Debounced silent auto-save (triggered by proxy setter) */
    function autosave() {
        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(() => save(null), 150);
    }

    /* Load from server + subscribe to SSE */
    async function init() {
        if (_ready) return;
        try {
            const res = await fetch('/api/db');
            const data = await res.json();
            merge(data);
        } catch (e) {
            console.warn('[AppState] server offline — using defaults. Start server.js!');
        }

        // SSE subscription
        _sse = new EventSource('/api/events');
        _sse.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.state) merge(msg.state);
                if (msg.eventType) StateEvents.emit(msg.eventType, msg.payload || {});
            } catch (_) { }
        };
        _sse.onerror = () => console.warn('[AppState] SSE disconnected — will auto-reconnect');
        _ready = true;
    }

    /* Hard reset via server */
    function reset() {
        return fetch('/api/reset', { method: 'POST' })
            .then(r => r.json())
            .catch(err => console.warn('[AppState] reset failed:', err.message));
    }

    /* Proxy so portals can use AppState.xxx = val as before */
    return new Proxy(_s, {
        get(target, key) {
            if (key === 'save') return save;
            if (key === 'reset') return reset;
            if (key === 'init') return init;
            return target[key];
        },
        set(target, key, val) {
            target[key] = val;
            autosave();      // write to file silently
            return true;
        },
    });
})();

/* ─────────────────────── BLOCKCHAIN UTILS ── */
const Blockchain = {
    randomHex(len = 64) {
        const c = '0123456789abcdef';
        return '0x' + Array.from({ length: len }, () => c[Math.floor(Math.random() * 16)]).join('');
    },
    nextBlock() {
        AppState.blockNumber += Math.floor(Math.random() * 4) + 1;
        return AppState.blockNumber;
    },
    addEntry(type, actor, data, extra = {}) {
        const entry = {
            block: Blockchain.nextBlock(),
            timestamp: new Date(),
            type, actor, data,
            txHash: Blockchain.randomHex(64),
            ...extra,
        };
        // Push to local array directly (avoid proxy array mutation triggering autosave per push)
        AppState.ledger.unshift(entry);
        // Explicit silent save — will be flushed by the next explicit save('event') call
        AppState.save(null);
        return entry;
    },
};

/* ─────────────────────── WEATHER SERVICE ── */
const WeatherService = {
    LAT: 25.07, LON: 91.00,
    cache: null,

    async fetch() {
        if (this.cache) return this.cache;
        try {
            const url =
                `https://api.open-meteo.com/v1/forecast?` +
                `latitude=${this.LAT}&longitude=${this.LON}` +
                `&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m` +
                `&daily=precipitation_sum&forecast_days=3&timezone=Asia%2FDhaka`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const daily = data.daily?.precipitation_sum || [];
            const rainfall72h = daily.reduce((a, v) => a + (v || 0), 0);
            const hourIdx = Math.min(new Date().getHours(), (data.hourly?.temperature_2m?.length || 1) - 1);
            this.cache = {
                rainfall72h: parseFloat(rainfall72h.toFixed(1)),
                temp: parseFloat((data.hourly?.temperature_2m?.[hourIdx] ?? 28.5).toFixed(1)),
                humidity: parseFloat((data.hourly?.relativehumidity_2m?.[hourIdx] ?? 76).toFixed(0)),
                wind: parseFloat((data.hourly?.windspeed_10m?.[hourIdx] ?? 16).toFixed(1)),
                source: 'Open-Meteo API (live)', fetchedAt: new Date(),
            };
        } catch (_) {
            this.cache = { rainfall72h: 47.2, temp: 29.3, humidity: 84, wind: 18.5, source: 'Fallback', fetchedAt: new Date() };
        }
        return this.cache;
    },
};

/* ─────────────────────── ORACLE ENGINE ── */
const OracleEngine = {
    simulate(flood = false) {
        const w = WeatherService.cache || { rainfall72h: 47.2, temp: 29.3, humidity: 84, wind: 18.5 };
        return {
            rainfall: flood ? 237.5 : w.rainfall72h,
            ndvi: flood ? 62.4 : (8 + Math.random() * 8),
            river: flood ? 9.8 : (5.5 + Math.random() * 1.5),
            temp: w.temp, humidity: w.humidity, wind: w.wind,
        };
    },
    evaluate(data) {
        const t = AppState.thresholds;
        const r = (v, th) => ({ value: v, met: v > th, pct: Math.min((v / th) * 100, 130) });
        return {
            rainfall: r(data.rainfall, t.rainfall),
            ndvi: r(data.ndvi, t.ndvi),
            river: r(data.river, t.river),
            allMet: data.rainfall > t.rainfall && data.ndvi > t.ndvi && data.river > t.river,
        };
    },
};

/* ─────────────────────── UI HELPERS ── */
const UI = {
    $: id => document.getElementById(id),
    setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; },
    setHTML(id, v) { const e = document.getElementById(id); if (e) e.innerHTML = v; },
    show(id) { const e = document.getElementById(id); if (e) e.style.display = ''; },
    hide(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; },
    delay(ms) { return new Promise(r => setTimeout(r, ms)); },

    showToast(msg, type = 'info', duration = 3500) {
        let t = document.getElementById('fp-toast');
        if (!t) { t = document.createElement('div'); t.id = 'fp-toast'; document.body.appendChild(t); }
        clearTimeout(UI._tt);
        t.innerHTML = msg;
        t.className = `show ${type}`;
        UI._tt = setTimeout(() => t.classList.remove('show'), duration);
    },

    formatDate(d) { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); },
    formatTime(d) { return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); },
    shortHash(h) { return h ? h.slice(0, 10) + '…' + h.slice(-6) : '—'; },

    animateCounter(el, from, to, duration = 900, prefix = '৳') {
        if (!el) return;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            el.textContent = prefix + Math.round(from + (to - from) * ease).toLocaleString();
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    },
};

/* ─────────────────────── BLOCKCHAIN CANVAS ── */
const BlockchainBg = {
    nodes: [], edges: [], raf: null,
    init(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const resize = () => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
            this._gen(canvas.width, canvas.height);
        };
        window.addEventListener('resize', resize, { passive: true });
        resize();
        if (this.raf) cancelAnimationFrame(this.raf);
        this._draw(ctx, canvas);
    },
    _gen(W, H) {
        const n = Math.max(Math.floor((W * H) / 22000), 8);
        this.nodes = Array.from({ length: n }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
            r: 1.5 + Math.random() * 2.5, pulse: Math.random() * Math.PI * 2,
        }));
        this.edges = [];
        const D = 180;
        for (let i = 0; i < this.nodes.length; i++)
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x, dy = this.nodes[i].y - this.nodes[j].y;
                if (dx * dx + dy * dy < D * D) this.edges.push([i, j]);
            }
    },
    _draw(ctx, canvas) {
        const D = 180;
        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.nodes.forEach(n => {
                n.x += n.vx; n.y += n.vy; n.pulse += 0.018;
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
            });
            this.edges.forEach(([i, j]) => {
                const a = this.nodes[i], b = this.nodes[j];
                const dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d > D) return;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(0,200,150,${(1 - d / D) * 0.12})`; ctx.lineWidth = .8; ctx.stroke();
            });
            this.nodes.forEach(n => {
                const g = .3 + .5 * Math.abs(Math.sin(n.pulse));
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0,200,150,${g})`; ctx.fill();
            });
            this.raf = requestAnimationFrame(loop);
        };
        loop();
    },
};

/* ─────────────────────── PAGE BOOTSTRAP ── */
function initPageTransitions() {
    document.querySelectorAll('a[data-portal]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            document.body.classList.remove('visible');
            setTimeout(() => { window.location.href = a.getAttribute('href'); }, 250);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('visible');
    initPageTransitions();
});
