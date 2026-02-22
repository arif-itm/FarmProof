/**
 * FarmProof — Demo Server
 * Serves static files + REST API + SSE live updates
 * All portal data persisted in demoDatabase.json
 * Run: node server.js   →  http://localhost:3001
 */
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'demoDatabase.json');

/* ── Default / reset state ── */
const DEFAULTS = () => ({
    farmers: [],
    ledger: [],
    blockNumber: 19_400_000,
    poolBalance: 0,
    totalCoverage: 0,
    payoutCount: 0,
    payoutTotal: 0,
    thresholds: { rainfall: 200, ndvi: 40, river: 8.5 },
    floodSimulated: false,
});

/* ── File helpers ── */
function readDB() {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch { return DEFAULTS(); }
}
function writeDB(state) {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/* ── SSE client registry ── */
const sseClients = new Set();

function broadcast(eventType, payload, state) {
    if (!sseClients.size) return;
    const msg = JSON.stringify({ eventType, payload, state });
    const line = `data: ${msg}\n\n`;
    sseClients.forEach(res => {
        try { res.write(line); } catch (_) { sseClients.delete(res); }
    });
    console.log(`[SSE] broadcast "${eventType}" → ${sseClients.size} clients`);
}

/* ── Middleware ── */
app.use(express.static(__dirname));
app.use(express.json({ limit: '20mb' }));

/* CORS for dev */
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

/* ── GET /api/db — return current DB ── */
app.get('/api/db', (req, res) => {
    res.json(readDB());
});

/* ── POST /api/db — update state, broadcast SSE ── */
app.post('/api/db', (req, res) => {
    const { state, eventType = 'update', payload = {} } = req.body;
    if (!state) return res.status(400).json({ error: 'missing state' });
    writeDB(state);
    if (eventType) broadcast(eventType, payload, state);
    res.json({ ok: true, eventType });
});

/* ── POST /api/reset — wipe to defaults, broadcast SSE ── */
app.post('/api/reset', (req, res) => {
    const fresh = DEFAULTS();
    writeDB(fresh);
    broadcast('reset', {}, fresh);
    console.log('[RESET] demoDatabase.json cleared to defaults');
    res.json({ ok: true });
});

/* ── GET /api/events — SSE endpoint, one per browser tab ── */
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx compat
    res.flushHeaders();

    /* Heartbeat every 25 s to keep connection alive */
    const hb = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch (_) { }
    }, 25_000);

    sseClients.add(res);
    console.log(`[SSE] client connected (total: ${sseClients.size})`);

    req.on('close', () => {
        sseClients.delete(res);
        clearInterval(hb);
        console.log(`[SSE] client left (total: ${sseClients.size})`);
    });
});

/* ── GET /api/status — quick health check ── */
app.get('/api/status', (req, res) => {
    const db = readDB();
    res.json({
        ok: true,
        clients: sseClients.size,
        farmers: db.farmers.length,
        ledger: db.ledger.length,
        pool: db.poolBalance,
    });
});

/* ── Start ── */
// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) writeDB(DEFAULTS());

app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║  FarmProof Dev Server  ·  Ready           ║');
    console.log(`  ║  Open → http://localhost:${PORT}             ║`);
    console.log('  ║  Data → demoDatabase.json                ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
});
