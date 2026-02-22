import { useEffect, useRef } from 'react';
import { initBlockchainBg } from '../lib/blockchainBg.js';

export default function BlockchainCanvas({ className = '' }) {
    const ref = useRef(null);
    useEffect(() => initBlockchainBg(ref.current), []);
    return (
        <canvas
            ref={ref}
            className={`absolute inset-0 w-full h-full ${className}`}
        />
    );
}
