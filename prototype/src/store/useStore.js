import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CHANNEL = 'fp_sync';
const STORE_KEY = 'fp_db';

const DEFAULTS = {
    farmers: [],
    ledger: [],
    blockNumber: 19_400_000,
    poolBalance: 0,
    totalCoverage: 0,
    payoutCount: 0,
    payoutTotal: 0,
    thresholds: { rainfall: 200, ndvi: 40, river: 8.5 },
    floodSimulated: false,
    weatherData: null,
};

// BroadcastChannel for cross-tab sync
let bc = null;
try { bc = new BroadcastChannel(CHANNEL); } catch (_) { }

function hydrate(state) {
    state.ledger = (state.ledger || []).map(e => ({
        ...e,
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));
    state.farmers = (state.farmers || []).map(f => ({
        ...f,
        registeredAt: f.registeredAt ? new Date(f.registeredAt) : new Date(),
    }));
    return state;
}

export const useStore = create(
    persist(
        (set, get) => ({
            ...DEFAULTS,

            // ── Actions ──────────────────────────────────────────────

            setWeatherData(weatherData) {
                set({ weatherData });
                _broadcast({ weatherData });
            },

            registerFarmer(farmer) {
                const s = get();
                const farmers = [...s.farmers, farmer];
                const poolBalance = s.poolBalance + farmer.premium;
                const totalCoverage = s.totalCoverage + farmer.coverage;
                set({ farmers, poolBalance, totalCoverage });
                _broadcast({ farmers, poolBalance, totalCoverage });
            },

            addLedgerEntry(entry) {
                const ledger = [entry, ...get().ledger];
                set({ ledger });
                _broadcast({ ledger });
            },

            advanceBlock() {
                const blockNumber = get().blockNumber + Math.floor(Math.random() * 4) + 1;
                set({ blockNumber });
                return blockNumber;
            },

            markFarmerPaid(farmerId, payoutTx, payoutBlock, amount) {
                const farmers = get().farmers.map(f =>
                    f.id === farmerId ? { ...f, paid: true, payoutTx, payoutBlock } : f
                );
                const poolBalance = Math.max(0, get().poolBalance - amount);
                const payoutCount = get().payoutCount + 1;
                const payoutTotal = get().payoutTotal + amount;
                set({ farmers, poolBalance, payoutCount, payoutTotal });
                _broadcast({ farmers, poolBalance, payoutCount, payoutTotal });
            },

            setFloodSimulated(floodSimulated) {
                set({ floodSimulated });
                _broadcast({ floodSimulated });
            },

            setThresholds(thresholds) {
                set({ thresholds });
                _broadcast({ thresholds });
            },

            resetState() {
                const fresh = { ...DEFAULTS, ledger: [], farmers: [] };
                set(fresh);
                _broadcast(fresh);
            },

            // Called by BroadcastChannel receiver — patch store without re-broadcasting
            _patch(partial) {
                set(hydrate({ ...get(), ...partial }));
            },
        }),
        {
            name: STORE_KEY,
            // Rehydrate dates after loading from localStorage
            onRehydrateStorage: () => (state) => {
                if (state) hydrate(state);
            },
        }
    )
);

// ── BroadcastChannel sync ────────────────────────────────────────
function _broadcast(partial) {
    if (bc) {
        try { bc.postMessage(partial); } catch (_) { }
    }
}

if (bc) {
    bc.onmessage = (e) => {
        useStore.getState()._patch(e.data);
    };
}
