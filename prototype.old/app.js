/* ═══════════════════════════════════════════════════════════════════
   FarmProof — Application Logic
   Modules: State, Blockchain, WeatherService, OracleEngine,
            TriggerEvaluator, PayoutEngine, AuditTrail,
            Analytics, AdminPanel, UI Helpers
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────── STATE ── */
const AppState = {
  farmers: [],
  ledger: [],         // all on-chain events
  blockNumber: 19_400_000,
  poolBalance: 0,
  totalCoverage: 0,
  payoutCount: 0,
  payoutTotal: 0,
  weatherData: null,
  thresholds: { rainfall: 200, ndvi: 40, river: 8.5 },
  coverage: { basic: 25000, standard: 50000, premium: 100000 },
  premiums:  { basic: 800,   standard: 1500,  premium: 2800  },
  oracleRunning: false,
  floodSimulated: false,
  chartPool: null,
  chartCrop: null,
};

/* ─────────────────────────────────────── BLOCKCHAIN UTILS ── */
const Blockchain = {
  randomHex(len = 64) {
    const chars = '0123456789abcdef';
    return '0x' + Array.from({ length: len }, () => chars[Math.floor(Math.random() * 16)]).join('');
  },
  nextBlock() {
    AppState.blockNumber += Math.floor(Math.random() * 4) + 1;
    return AppState.blockNumber;
  },
  shortAddress(addr) {
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  },
  addLedgerEntry(type, actor, data, extra = {}) {
    const entry = {
      block: Blockchain.nextBlock(),
      timestamp: new Date(),
      type,
      actor,
      data,
      txHash: Blockchain.randomHex(64),
      ...extra,
    };
    AppState.ledger.unshift(entry);
    AuditTrail.render();
    Analytics.updateKPIs();
    return entry;
  },
};

/* ─────────────────────────────────────── WEATHER SERVICE ── */
const WeatherService = {
  LAT: 25.07,
  LON: 91.00,
  lastFetch: null,
  isFetching: false,

  async fetch() {
    if (this.isFetching) return;
    this.isFetching = true;
    UI.setEl('oracle-updated', '⏳ Fetching live data…');

    try {
      const url = `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${this.LAT}&longitude=${this.LON}` +
        `&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m` +
        `&daily=precipitation_sum` +
        `&forecast_days=3` +
        `&timezone=Asia%2FDhaka`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // Compute 72h cumulative rainfall from daily sums
      const daily = data.daily?.precipitation_sum || [];
      const rainfall72h = daily.reduce((a, v) => a + (v || 0), 0);

      // Current hour values
      const hourly = data.hourly;
      const now = new Date();
      const hourIdx = Math.min(now.getHours(), (hourly.temperature_2m?.length || 1) - 1);
      const temp = hourly.temperature_2m?.[hourIdx] ?? 28;
      const humidity = hourly.relativehumidity_2m?.[hourIdx] ?? 72;
      const wind = hourly.windspeed_10m?.[hourIdx] ?? 14;

      AppState.weatherData = {
        rainfall72h: parseFloat(rainfall72h.toFixed(1)),
        temp: parseFloat(temp.toFixed(1)),
        humidity: parseFloat(humidity.toFixed(0)),
        wind: parseFloat(wind.toFixed(1)),
        source: 'Open-Meteo API (live)',
      };
      this.lastFetch = new Date();

      // Log oracle fetch to ledger
      Blockchain.addLedgerEntry('oracle', 'Oracle Engine',
        `Weather fetch: ${rainfall72h.toFixed(1)}mm / ${temp.toFixed(1)}°C / ${humidity}%RH`,
        { txHash: Blockchain.randomHex() });

      UI.showToast('✅ Live weather data loaded from Open-Meteo', 'success');

    } catch (err) {
      console.warn('Open-Meteo fetch failed, using fallback:', err.message);
      // Fallback — realistic monsoon values for Sunamganj
      AppState.weatherData = {
        rainfall72h: 47.2,
        temp: 29.3,
        humidity: 84,
        wind: 18.5,
        source: 'Fallback (API unavailable)',
      };
      UI.showToast('⚠️ Using fallback weather data (API unreachable)', 'error');
    } finally {
      this.isFetching = false;
      Dashboard.render();
    }
  },
};

/* ─────────────────────────────────────── ORACLE ENGINE ── */
const OracleEngine = {
  // Simulate NDVI from Sentinel-2 (normally computed from band values)
  computeNDVI() {
    // Normal healthy rice: NDVI drop ~5–15%. Flood stress: 50–70%
    const base = AppState.floodSimulated ? 62.4 : (8 + Math.random() * 8);
    return parseFloat(base.toFixed(1));
  },

  // Simulate Surma river level from FFWC
  computeRiverLevel() {
    const base = AppState.floodSimulated ? 9.8 : (5.5 + Math.random() * 1.5);
    return parseFloat(base.toFixed(2));
  },

  // Return all three oracle values (enriched with flood if simulated)
  getData() {
    const weather = AppState.weatherData || { rainfall72h: 0, temp: 28, humidity: 70, wind: 12 };
    return {
      rainfall: AppState.floodSimulated ? 237.5 : weather.rainfall72h,
      ndvi: this.computeNDVI(),
      river: this.computeRiverLevel(),
      temp: weather.temp,
      humidity: weather.humidity,
      wind: weather.wind,
    };
  },
};

/* ─────────────────────────────────────── TRIGGER EVALUATOR ── */
const TriggerEvaluator = {
  evaluate(data) {
    const t = AppState.thresholds;
    return {
      rainfall: { value: data.rainfall, met: data.rainfall > t.rainfall },
      ndvi:     { value: data.ndvi,     met: data.ndvi     > t.ndvi     },
      river:    { value: data.river,    met: data.river    > t.river    },
      allMet:   data.rainfall > t.rainfall && data.ndvi > t.ndvi && data.river > t.river,
    };
  },
};

/* ─────────────────────────────────────── PAYOUT ENGINE ── */
const PayoutEngine = {
  async simulate() {
    AppState.floodSimulated = true;
    const data = OracleEngine.getData();
    const result = TriggerEvaluator.evaluate(data);

    // Update trigger UI
    TriggerPanel.updateConditions(data, result);

    const startTime = Date.now();

    // Step 1 — validate oracle
    UI.setStepActive(1);
    await UI.delay(1200);
    UI.setStepDone(1);

    // Step 2 — smart contract triggered
    UI.setStepActive(2);
    await UI.delay(1600);
    UI.setStepDone(2);

    // Log trigger event
    Blockchain.addLedgerEntry('oracle', 'Oracle Engine',
      `Parametric thresholds BREACHED: RF=${data.rainfall}mm NDVI=${data.ndvi}% River=${data.river}m`);

    // Step 3 — block mined
    UI.setStepActive(3);
    await UI.delay(2000);
    const block = Blockchain.nextBlock();
    UI.setStepDone(3);

    // Step 4 — fund transfer
    UI.setStepActive(4);

    // Pay all registered farmers
    let totalPaid = 0;
    if (AppState.farmers.length === 0) {
      // Demo payout if no farmer registered
      totalPaid = 50000;
      AppState.payoutCount += 1;
      AppState.payoutTotal += totalPaid;
    } else {
      for (const f of AppState.farmers) {
        if (!f.paid) {
          const amount = AppState.coverage[f.tier] || 50000;
          totalPaid += amount;
          AppState.poolBalance = Math.max(0, AppState.poolBalance - amount);
          AppState.payoutCount += 1;
          AppState.payoutTotal += amount;
          f.paid = true;
          f.payoutTx = Blockchain.randomHex();
          f.payoutBlock = block;
          // Ledger entry per farmer
          Blockchain.addLedgerEntry('payout', `Contract 0x7B4a…3Fc2`,
            `Payout ৳${amount.toLocaleString()} → ${f.name} (${f.wallet})`,
            { amount, block });
        }
      }
    }

    if (totalPaid === 0 && AppState.farmers.length > 0) {
      totalPaid = AppState.farmers.reduce((s, f) => s + (AppState.coverage[f.tier] || 50000) * (f.paid ? 1 : 0), 0);
    }

    await UI.delay(1800);
    UI.setEl('pss-4-sub', `৳${(totalPaid || 50000).toLocaleString()} transferred to bKash`);
    UI.setStepDone(4);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Show result
    const payoutEl = document.getElementById('payout-result');
    UI.setEl('pr-amount', `৳${(totalPaid || 50000).toLocaleString()}`);
    UI.setEl('pr-tx', `TxHash: ${Blockchain.randomHex()}`);
    UI.setEl('pr-time', `${elapsed}s`);
    payoutEl.style.display = 'block';

    Pool.update();
    FarmerList.render();
    Analytics.updateKPIs();
    Analytics.updateCharts();

    // Update district
    const det = document.getElementById('district-detail-sunamganj');
    if (det) det.textContent = `${AppState.payoutCount} payout(s) · ৳${AppState.payoutTotal.toLocaleString()} total`;

    UI.showToast('🎉 Auto-payout executed on blockchain!', 'success');
  },
};

/* ─────────────────────────────────────── REGISTRATION ── */
const Registration = {
  init() {
    const form = document.getElementById('register-form');
    const coverageSel = document.getElementById('coverage-tier');
    const plantDate = document.getElementById('plant-date');

    // Set default planting date to today
    plantDate.value = new Date().toISOString().split('T')[0];

    // Live premium summary updates
    coverageSel.addEventListener('change', Registration.updateSummary);

    form.addEventListener('submit', Registration.handleSubmit);
  },

  updateSummary() {
    const tier = document.getElementById('coverage-tier').value;
    const coverage = AppState.coverage[tier] || 50000;
    const premium = AppState.premiums[tier] || 1500;
    UI.setEl('ps-coverage', `৳${coverage.toLocaleString()}`);
    UI.setEl('ps-premium', `৳${premium.toLocaleString()}`);
  },

  handleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const name    = document.getElementById('farmer-name').value.trim();
    const wallet  = document.getElementById('farmer-wallet').value.trim();
    const crop    = document.getElementById('crop-type').value;
    const area    = parseFloat(document.getElementById('land-area').value);
    const lat     = parseFloat(document.getElementById('gps-lat').value);
    const lon     = parseFloat(document.getElementById('gps-lon').value);
    const planted = document.getElementById('plant-date').value;
    const tier    = document.getElementById('coverage-tier').value;

    // Validation
    let valid = true;
    if (!name) { UI.markError('farmer-name'); valid = false; }
    if (!wallet || wallet.length < 11) { UI.markError('farmer-wallet'); valid = false; }
    if (!crop) { UI.markError('crop-type'); valid = false; }
    if (isNaN(area) || area <= 0) { UI.markError('land-area'); valid = false; }
    if (!planted) { UI.markError('plant-date'); valid = false; }
    if (!valid) { UI.showToast('Please fill all required fields', 'error'); return; }

    const coverage = AppState.coverage[tier];
    const premium  = AppState.premiums[tier];
    const address  = Blockchain.randomHex(40);

    const farmer = {
      id: Date.now(),
      name, wallet, crop, area, lat, lon, planted, tier,
      coverage, premium, address,
      registeredAt: new Date(),
      paid: false,
    };

    AppState.farmers.push(farmer);
    AppState.poolBalance += premium;
    AppState.totalCoverage += coverage;

    // Blockchain writes
    const regEntry = Blockchain.addLedgerEntry('registration', farmer.name,
      `Registered ${crop} · ${area} bigha · GPS(${lat},${lon})`,
      { address: farmer.address });

    Blockchain.addLedgerEntry('premium', farmer.name,
      `Premium paid ৳${premium.toLocaleString()} · Locked in contract pool`);

    // Show tx result
    Registration.showResult(farmer, regEntry.txHash, regEntry.block);

    // Reset form
    form.reset();
    plantDate.value = new Date().toISOString().split('T')[0];
    Registration.updateSummary();

    FarmerList.render();
    Pool.update();
    PolicySelect.update();
    Analytics.updateKPIs();
    Analytics.updateCharts();

    UI.showToast(`✅ ${name} registered on blockchain`, 'success');
  },

  showResult(farmer, txHash, block) {
    const el = document.getElementById('tx-result');
    el.style.display = 'block';
    document.getElementById('tx-details').innerHTML = `
      <div class="tx-row"><span>Status</span><span>✓ Confirmed</span></div>
      <div class="tx-row"><span>Block</span><span>#${block.toLocaleString()}</span></div>
      <div class="tx-row"><span>Farmer</span><span>${farmer.name}</span></div>
      <div class="tx-row"><span>Crop</span><span>${farmer.crop}</span></div>
      <div class="tx-row"><span>Coverage</span><span>৳${farmer.coverage.toLocaleString()}</span></div>
      <div class="tx-row"><span>Premium Paid</span><span>৳${farmer.premium.toLocaleString()}</span></div>
      <div class="tx-row"><span>Contract Addr</span><span>${farmer.address.slice(0,10)}…${farmer.address.slice(-6)}</span></div>
      <div class="tx-row"><span>TxHash</span><span>${txHash.slice(0,10)}…${txHash.slice(-8)}</span></div>
    `;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
};

/* ─────────────────────────────────────── FARMER LIST ── */
const FarmerList = {
  render() {
    const list = document.getElementById('farmer-list');
    const count = document.getElementById('farmer-count');
    count.textContent = AppState.farmers.length;

    if (AppState.farmers.length === 0) {
      list.innerHTML = `<div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <p>No farmers registered yet</p></div>`;
      return;
    }

    list.innerHTML = AppState.farmers.map((f, i) => `
      <div class="farmer-item">
        <div class="farmer-avatar">${f.name.charAt(0).toUpperCase()}</div>
        <div class="farmer-info">
          <div class="farmer-name">${f.name}</div>
          <div class="farmer-meta">${f.crop} · ${f.area} bigha · ৳${f.coverage.toLocaleString()}</div>
        </div>
        <div class="farmer-status">
          ${f.paid
            ? '<span style="color:var(--accent);font-size:.75rem;font-weight:700">PAID ✓</span>'
            : '<div class="farmer-status-dot"></div>'}
        </div>
      </div>`).join('');
  },
};

/* ─────────────────────────────────────── POOL ── */
const Pool = {
  update() {
    UI.setEl('pool-amount', `৳${AppState.poolBalance.toLocaleString()}`);
    const max = 200000;
    const pct = Math.min((AppState.poolBalance / max) * 100, 100);
    document.getElementById('pool-bar').style.width = pct + '%';
    UI.setEl('pool-sub', `${AppState.farmers.length} ${AppState.farmers.length === 1 ? 'policy' : 'policies'} active`);
  },
};

/* ─────────────────────────────────────── DASHBOARD ── */
const Dashboard = {
  render() {
    const d = OracleEngine.getData();
    const t = AppState.thresholds;

    const now = new Date();
    UI.setEl('oracle-updated', `Updated: ${now.toLocaleTimeString()}`);

    // Rainfall
    const rfPct = Math.min((d.rainfall / (t.rainfall * 1.5)) * 100, 100);
    UI.setEl('w-rainfall', d.rainfall.toFixed(1));
    Dashboard.setBar('wb-rainfall', rfPct, d.rainfall > t.rainfall ? 'var(--red)' : 'var(--accent)');
    Dashboard.setCardStatus('wc-rainfall', 'ws-rainfall', d.rainfall, t.rainfall, 'mm/72h');

    // NDVI
    const ndPct = Math.min((d.ndvi / 100) * 100, 100);
    UI.setEl('w-ndvi', d.ndvi.toFixed(1));
    Dashboard.setBar('wb-ndvi', ndPct, d.ndvi > t.ndvi ? 'var(--red)' : 'var(--accent)');
    Dashboard.setCardStatus('wc-ndvi', 'ws-ndvi', d.ndvi, t.ndvi, '% drop');

    // River
    const rvPct = Math.min((d.river / (t.river * 1.3)) * 100, 100);
    UI.setEl('w-river', d.river.toFixed(2));
    Dashboard.setBar('wb-river', rvPct, d.river > t.river ? 'var(--red)' : 'var(--accent)');
    Dashboard.setCardStatus('wc-river', 'ws-river', d.river, t.river, 'm', true);

    // Temp, Humidity, Wind
    const tempPct = Math.min((d.temp / 50) * 100, 100);
    UI.setEl('w-temp', d.temp.toFixed(1));
    Dashboard.setBar('wb-temp', tempPct, 'var(--amber)');
    const humPct = d.humidity;
    UI.setEl('w-humidity', d.humidity);
    Dashboard.setBar('wb-humidity', humPct, 'var(--blue)');
    const windPct = Math.min((d.wind / 60) * 100, 100);
    UI.setEl('w-wind', d.wind.toFixed(1));
    Dashboard.setBar('wb-wind', windPct, 'var(--purple)');
    UI.setEl('ws-temp', `Open-Meteo · ${AppState.weatherData?.source || 'loading'}`);

    // Update trigger page too
    TriggerPanel.updateConditions(d, TriggerEvaluator.evaluate(d));
  },

  setBar(id, pct, color) {
    const el = document.getElementById(id);
    if (el) { el.style.width = pct + '%'; el.style.background = color; }
  },

  setCardStatus(cardId, statusId, val, thresh, unit, isRiver = false) {
    const card = document.getElementById(cardId);
    const status = document.getElementById(statusId);
    if (!card || !status) return;
    card.classList.remove('alert', 'warning', 'safe');
    if (val > thresh) {
      card.classList.add('alert');
      status.className = 'wc-status danger';
      status.textContent = `⚠ THRESHOLD BREACHED (${val.toFixed(1)} ${unit})`;
    } else if (val > thresh * 0.75) {
      card.classList.add('warning');
      status.className = 'wc-status caution';
      status.textContent = `⚡ Approaching threshold`;
    } else {
      card.classList.add('safe');
      status.className = 'wc-status ok';
      status.textContent = `✓ Within safe range`;
    }
  },
};

/* ─────────────────────────────────────── POLICY SELECT ── */
const PolicySelect = {
  update() {
    const sel = document.getElementById('policy-select');
    const current = sel.value;
    sel.innerHTML = '<option value="">— Select Farmer —</option>' +
      AppState.farmers.map(f =>
        `<option value="${f.id}"${f.id == current ? ' selected' : ''}>${f.name}</option>`
      ).join('');
    if (current) PolicySelect.showStatus(current);
  },

  showStatus(farmerId) {
    const f = AppState.farmers.find(x => x.id == farmerId);
    const body = document.getElementById('is-body');
    if (!f) { body.innerHTML = '<div class="is-empty">Select a farmer above.</div>'; return; }
    const d = OracleEngine.getData();
    body.innerHTML = `
      <div class="is-grid">
        <div class="is-field"><label>Farmer</label><span>${f.name}</span></div>
        <div class="is-field"><label>Crop</label><span>${f.crop}</span></div>
        <div class="is-field"><label>Land</label><span>${f.area} bigha</span></div>
        <div class="is-field"><label>Coverage</label><span>৳${f.coverage.toLocaleString()}</span></div>
        <div class="is-field"><label>Premium Paid</label><span>৳${f.premium.toLocaleString()}</span></div>
        <div class="is-field"><label>Status</label>
          <span style="color:${f.paid ? 'var(--accent)' : '#F59E0B'}">
            ${f.paid ? '✓ Payout Executed' : '⚡ Active — Monitoring'}
          </span>
        </div>
        <div class="is-field"><label>GPS</label><span>${f.lat}°N, ${f.lon}°E</span></div>
        <div class="is-field"><label>Planted</label><span>${f.planted}</span></div>
        <div class="is-field"><label>Registered</label><span>${f.registeredAt.toLocaleDateString()}</span></div>
        ${f.paid ? `<div class="is-field"><label>Payout TxHash</label><span style="font-family:var(--mono);font-size:.72rem">${f.payoutTx?.slice(0,16)}…</span></div>` : ''}
      </div>`;
  },
};

/* ─────────────────────────────────────── TRIGGER PANEL ── */
const TriggerPanel = {
  updateConditions(data, result) {
    const update = (name, r, raw, unit) => {
      const valEl = document.getElementById(`cv-${name}`);
      const badgeEl = document.getElementById(`cb-${name}`);
      const itemEl = document.getElementById(`cond-${name}`);
      if (!valEl) return;
      valEl.textContent = `${raw.toFixed(name === 'river' ? 2 : 1)}${unit}`;
      itemEl.classList.remove('met', 'fail');
      badgeEl.classList.remove('met', 'fail', 'pending');
      if (r.met) {
        badgeEl.textContent = 'MET ✓';
        badgeEl.classList.add('met');
        itemEl.classList.add('met');
      } else {
        badgeEl.textContent = 'NOT MET';
        badgeEl.classList.add('fail');
        itemEl.classList.add('fail');
      }
    };
    update('rainfall', result.rainfall, data.rainfall, 'mm');
    update('ndvi', result.ndvi, data.ndvi, '%');
    update('river', result.river, data.river, 'm');
  },
};

/* ─────────────────────────────────────── AUDIT TRAIL ── */
const AuditTrail = {
  filter: 'all',
  search: '',

  render() {
    const tbody = document.getElementById('audit-tbody');
    let entries = AppState.ledger;

    if (this.filter !== 'all') entries = entries.filter(e => e.type === this.filter);
    if (this.search) {
      const q = this.search.toLowerCase();
      entries = entries.filter(e =>
        e.txHash.toLowerCase().includes(q) ||
        e.type.includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.data.toLowerCase().includes(q));
    }

    if (entries.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${AppState.ledger.length === 0 ? 'No on-chain events yet. Register a farmer to begin.' : 'No events match the current filter.'}</td></tr>`;
      return;
    }

    tbody.innerHTML = entries.map(e => `
      <tr>
        <td style="font-family:var(--mono);color:var(--text-2)">#${e.block.toLocaleString()}</td>
        <td style="color:var(--text-2);white-space:nowrap">${e.timestamp.toLocaleTimeString()}<br/><span style="font-size:.7rem;color:var(--text-3)">${e.timestamp.toLocaleDateString()}</span></td>
        <td><span class="event-tag ${e.type}">${e.type.toUpperCase()}</span></td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.actor}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.78rem;color:var(--text-2)">${e.data}</td>
        <td class="hash-cell" title="${e.txHash}" onclick="AuditTrail.copyHash('${e.txHash}')">${e.txHash.slice(0,10)}…${e.txHash.slice(-6)}</td>
      </tr>`).join('');
  },

  copyHash(hash) {
    document.getElementById('verify-hash').value = hash;
    navigator.clipboard?.writeText(hash).catch(() => {});
    UI.showToast('TxHash copied to verify field', 'success');
  },

  initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filter = btn.dataset.filter;
        this.render();
      });
    });

    document.getElementById('audit-search').addEventListener('input', e => {
      this.search = e.target.value;
      this.render();
    });

    document.getElementById('verify-btn').addEventListener('click', () => {
      const hash = document.getElementById('verify-hash').value.trim();
      const result = document.getElementById('verify-result');
      const found = AppState.ledger.find(e => e.txHash === hash);
      result.className = 'verify-result ' + (found ? 'ok' : 'fail');
      result.textContent = found
        ? `✓ Verified on chain — Block #${found.block.toLocaleString()} · ${found.type.toUpperCase()} · ${found.actor}`
        : hash ? '✗ Hash not found in current session ledger' : '';
    });
  },
};

/* ─────────────────────────────────────── ANALYTICS ── */
const Analytics = {
  updateKPIs() {
    UI.setEl('kpi-farmers', AppState.farmers.length);
    UI.setEl('kpi-pool', `৳${AppState.poolBalance.toLocaleString()}`);
    UI.setEl('kpi-payouts', AppState.payoutCount);
    UI.setEl('kpi-coverage', `৳${AppState.totalCoverage.toLocaleString()}`);
  },

  updateCharts() {
    // Pool flow chart
    const poolCtx = document.getElementById('pool-chart').getContext('2d');
    const poolIn  = AppState.farmers.reduce((s, f) => s + f.premium, 0);
    const poolOut = AppState.payoutTotal;

    if (AppState.chartPool) AppState.chartPool.destroy();
    AppState.chartPool = new Chart(poolCtx, {
      type: 'bar',
      data: {
        labels: ['Premiums Collected', 'Payouts Executed', 'Pool Balance'],
        datasets: [{
          label: '৳',
          data: [poolIn, poolOut, Math.max(0, poolIn - poolOut)],
          backgroundColor: ['rgba(0,200,150,.7)', 'rgba(239,68,68,.7)', 'rgba(59,130,246,.7)'],
          borderColor:     ['#00C896', '#EF4444', '#3B82F6'],
          borderWidth: 1, borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8B9CC8' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { ticks: { color: '#8B9CC8' }, grid: { color: 'rgba(255,255,255,.05)' } },
        },
      },
    });

    // Crop distribution donut
    const cropCtx = document.getElementById('crop-chart').getContext('2d');
    const cropCount = {};
    AppState.farmers.forEach(f => { cropCount[f.crop] = (cropCount[f.crop] || 0) + 1; });
    const crops = Object.keys(cropCount);
    const counts = Object.values(cropCount);
    const colors = ['#00C896', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

    if (AppState.chartCrop) AppState.chartCrop.destroy();
    AppState.chartCrop = new Chart(cropCtx, {
      type: crops.length ? 'doughnut' : 'doughnut',
      data: {
        labels: crops.length ? crops : ['No farmers yet'],
        datasets: [{
          data: counts.length ? counts : [1],
          backgroundColor: crops.length ? crops.map((_, i) => colors[i % colors.length]) : ['rgba(255,255,255,.1)'],
          borderColor: crops.length ? crops.map((_, i) => colors[i % colors.length]) : ['rgba(255,255,255,.1)'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8B9CC8', font: { size: 11 } } },
        },
        cutout: '65%',
      },
    });
  },
};

/* ─────────────────────────────────────── ADMIN PANEL ── */
const AdminPanel = {
  init() {
    const sliders = [
      { id: 'thresh-rainfall', valId: 'tv-rainfall', cfgId: 'cfg-rainfall', key: 'rainfall', unit: 'mm' },
      { id: 'thresh-ndvi',     valId: 'tv-ndvi',     cfgId: 'cfg-ndvi',     key: 'ndvi',     unit: '%'  },
      { id: 'thresh-river',    valId: 'tv-river',    cfgId: 'cfg-river',    key: 'river',    unit: 'm'  },
    ];

    sliders.forEach(s => {
      const slider = document.getElementById(s.id);
      if (!slider) return;
      slider.addEventListener('input', () => {
        const v = slider.value;
        UI.setEl(s.valId, `${v} ${s.unit}`);
        // Update slider gradient fill
        const min   = parseFloat(slider.min);
        const max   = parseFloat(slider.max);
        const pct   = ((parseFloat(v) - min) / (max - min)) * 100;
        slider.style.setProperty('--prog', pct + '%');
        // Update expr in trigger panel
        const exprEl = document.getElementById(`expr-${s.key}`);
        if (exprEl) exprEl.textContent = `${s.key}_${s.key === 'rainfall' ? '72h' : s.key === 'ndvi' ? 'drop' : 'level'} > ${v}${s.unit}`;
      });
      // Init gradient
      const min = parseFloat(slider.min), max = parseFloat(slider.max), val = parseFloat(slider.value);
      const pct = ((val - min) / (max - min)) * 100;
      slider.style.setProperty('--prog', pct + '%');
    });

    document.getElementById('save-thresholds-btn').addEventListener('click', () => {
      const rainfall = parseFloat(document.getElementById('thresh-rainfall').value);
      const ndvi     = parseFloat(document.getElementById('thresh-ndvi').value);
      const river    = parseFloat(document.getElementById('thresh-river').value);
      AppState.thresholds = { rainfall, ndvi, river };

      UI.setEl('cfg-rainfall', `${rainfall} mm`);
      UI.setEl('cfg-ndvi', `${ndvi} %`);
      UI.setEl('cfg-river', `${river} m`);
      UI.setEl('cfg-updated', new Date().toLocaleTimeString());

      const saveResult = document.getElementById('save-result');
      saveResult.className = 'save-result ok';
      saveResult.textContent = `✓ Thresholds updated @ block #${Blockchain.nextBlock()}`;

      Blockchain.addLedgerEntry('oracle', 'Admin',
        `Thresholds updated: rainfall=${rainfall}mm ndvi=${ndvi}% river=${river}m`);

      Dashboard.render();
      UI.showToast('✅ Thresholds saved to contract', 'success');
    });
  },
};

/* ─────────────────────────────────────── BLOCKCHAIN CANVAS ── */
const BlockchainCanvas = {
  nodes: [],
  edges: [],
  animFrame: null,

  init() {
    const canvas = document.getElementById('blockchain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      this.generate(canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();
    this.loop(ctx, canvas);
  },

  generate(W, H) {
    const count = Math.floor((W * H) / 18000);
    this.nodes = Array.from({ length: Math.max(count, 10) }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: 2 + Math.random() * 3,
      pulse: Math.random() * Math.PI * 2,
    }));
    this.edges = [];
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[i].x - this.nodes[j].x;
        const dy = this.nodes[i].y - this.nodes[j].y;
        if (Math.sqrt(dx*dx + dy*dy) < 200) this.edges.push([i, j]);
      }
    }
  },

  loop(ctx, canvas) {
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() / 1000;

      // Move nodes
      this.nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        n.pulse += 0.02;
      });

      // Draw edges
      this.edges.forEach(([i, j]) => {
        const a = this.nodes[i], b = this.nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 200) return;
        const alpha = (1 - dist / 200) * 0.15;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(0,200,150,${alpha})`;
        ctx.lineWidth = .8;
        ctx.stroke();
      });

      // Draw nodes
      this.nodes.forEach(n => {
        const glow = 0.4 + 0.6 * Math.sin(n.pulse);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (0.8 + 0.2 * glow), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,200,150,${0.3 + 0.4 * glow})`;
        ctx.fill();
      });

      this.animFrame = requestAnimationFrame(draw);
    };
    draw();
  },
};

/* ─────────────────────────────────────── UI HELPERS ── */
const UI = {
  setEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.textContent = html;
  },

  markError(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('error');
      setTimeout(() => el.classList.remove('error'), 2000);
    }
  },

  showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3500);
  },

  delay(ms) { return new Promise(r => setTimeout(r, ms)); },

  setStepActive(n) {
    const step = document.getElementById(`ps-${n}`);
    if (step) {
      step.classList.remove('done');
      step.classList.add('active');
      UI.setEl(`pss-${n}`, '⏳');
    }
  },

  setStepDone(n) {
    const step = document.getElementById(`ps-${n}`);
    if (step) {
      step.classList.remove('active');
      step.classList.add('done');
      UI.setEl(`pss-${n}`, '✅');
    }
  },
};

/* ─────────────────────────────────────── NAV ACTIVE ── */
const NavActive = {
  sections: ['hero','register','dashboard','trigger','audit','analytics','admin'],
  init() {
    window.addEventListener('scroll', this.update.bind(this), { passive: true });
    this.update();
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });

    // Hamburger
    document.getElementById('hamburger').addEventListener('click', () => {
      document.querySelector('.nav-links').classList.toggle('open');
    });
  },
  update() {
    const scrollY = window.scrollY + 100;
    let active = 'hero';
    this.sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) active = id;
    });
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + active);
    });
  },
};

/* ─────────────────────────────────────── INIT ── */
(async function init() {
  // Canvas
  BlockchainCanvas.init();

  // Navigation
  NavActive.init();

  // Set today as default planting date immediately
  const pd = document.getElementById('plant-date');
  if (pd) pd.value = new Date().toISOString().split('T')[0];

  // Forms
  Registration.init();
  AuditTrail.initFilters();
  AdminPanel.init();
  Analytics.updateCharts();

  // Policy select listener
  document.getElementById('policy-select').addEventListener('change', e => {
    PolicySelect.showStatus(e.target.value);
  });

  // Trigger buttons
  document.getElementById('simulate-flood-btn').addEventListener('click', async () => {
    document.getElementById('simulate-flood-btn').disabled = true;
    document.getElementById('payout-result').style.display = 'none';
    // Reset steps
    [1,2,3,4].forEach(n => {
      const s = document.getElementById(`ps-${n}`);
      if (s) { s.classList.remove('active','done'); UI.setEl(`pss-${n}`, '⏳'); }
    });
    UI.setEl('pss-4-sub', 'Executing payout to registered farmers…');
    await PayoutEngine.simulate();
  });

  document.getElementById('reset-trigger-btn').addEventListener('click', () => {
    AppState.floodSimulated = false;
    document.getElementById('simulate-flood-btn').disabled = false;
    document.getElementById('payout-result').style.display = 'none';
    [1,2,3,4].forEach(n => {
      const s = document.getElementById(`ps-${n}`);
      if (s) { s.classList.remove('active','done'); UI.setEl(`pss-${n}`, '⏳'); }
    });
    AppState.farmers.forEach(f => { f.paid = false; });
    Dashboard.render();
    FarmerList.render();
    UI.showToast('Trigger state reset', '');
  });

  // Refresh button
  document.getElementById('refresh-weather').addEventListener('click', async () => {
    await WeatherService.fetch();
  });

  // Fetch live weather on load
  await WeatherService.fetch();

  // Add genesis block to ledger
  Blockchain.addLedgerEntry('oracle', 'System',
    'FarmProof InsurancePool.sol deployed to Polygon Amoy Testnet',
    { txHash: '0x00genesis' + Blockchain.randomHex(54) });

})();
