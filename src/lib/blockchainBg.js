/** Animated blockchain particle canvas */
export function initBlockchainBg(canvas) {
    if (!canvas) return () => { };

    const ctx = canvas.getContext('2d');
    let nodes = [], edges = [], raf = null;

    function gen(W, H) {
        const n = Math.max(Math.floor((W * H) / 22000), 8);
        nodes = Array.from({ length: n }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
            r: 1.5 + Math.random() * 2.5, pulse: Math.random() * Math.PI * 2,
        }));
        edges = [];
        const D = 180;
        for (let i = 0; i < nodes.length; i++)
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
                if (dx * dx + dy * dy < D * D) edges.push([i, j]);
            }
    }

    function draw() {
        const W = canvas.width, H = canvas.height, D = 180;
        ctx.clearRect(0, 0, W, H);
        nodes.forEach(n => {
            n.x += n.vx; n.y += n.vy; n.pulse += 0.018;
            if (n.x < 0 || n.x > W) n.vx *= -1;
            if (n.y < 0 || n.y > H) n.vy *= -1;
        });
        edges.forEach(([i, j]) => {
            const a = nodes[i], b = nodes[j];
            const dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d > D) return;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(16,185,129,${(1 - d / D) * 0.12})`;
            ctx.lineWidth = 0.8; ctx.stroke();
        });
        nodes.forEach(n => {
            const g = 0.3 + 0.5 * Math.abs(Math.sin(n.pulse));
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(16,185,129,${g})`; ctx.fill();
        });
        raf = requestAnimationFrame(draw);
    }

    function resize() {
        canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
        canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
        gen(canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    draw();

    return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
    };
}
