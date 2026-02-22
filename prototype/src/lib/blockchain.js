import { useStore } from '../store/useStore.js';

const HEX_CHARS = '0123456789abcdef';

export const blockchain = {
    randomHex(len = 64) {
        return '0x' + Array.from({ length: len }, () =>
            HEX_CHARS[Math.floor(Math.random() * 16)]
        ).join('');
    },

    shortAddress(addr) {
        return addr.slice(0, 6) + '…' + addr.slice(-4);
    },

    shortHash(hash) {
        return hash ? hash.slice(0, 10) + '…' + hash.slice(-6) : '—';
    },

    /** Advance block number, return new block */
    nextBlock() {
        return useStore.getState().advanceBlock();
    },

    /** Create a ledger entry, persist to store, return it */
    addEntry(type, actor, data, extra = {}) {
        const entry = {
            block: blockchain.nextBlock(),
            timestamp: new Date(),
            type,
            actor,
            data,
            txHash: blockchain.randomHex(64),
            ...extra,
        };
        useStore.getState().addLedgerEntry(entry);
        return entry;
    },
};
