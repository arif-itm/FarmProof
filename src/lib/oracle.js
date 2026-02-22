/** Simulate oracle sensor data */
export function simulate(flood = false, weatherData = null) {
    const w = weatherData || { rainfall72h: 47.2, temp: 29.3, humidity: 84, wind: 18.5 };
    return {
        rainfall: flood ? 237.5 : w.rainfall72h,
        ndvi: flood ? 62.4 : parseFloat((8 + Math.random() * 8).toFixed(1)),
        river: flood ? 9.8 : parseFloat((5.5 + Math.random() * 1.5).toFixed(2)),
        temp: w.temp,
        humidity: w.humidity,
        wind: w.wind,
    };
}

/** Evaluate oracle data against thresholds */
export function evaluate(data, thresholds) {
    const { rainfall: rt, ndvi: nt, river: rv } = thresholds;
    const r = (val, th) => ({ value: val, met: val > th, pct: Math.min((val / th) * 100, 130) });
    const result = {
        rainfall: r(data.rainfall, rt),
        ndvi: r(data.ndvi, nt),
        river: r(data.river, rv),
    };
    result.allMet = result.rainfall.met && result.ndvi.met && result.river.met;
    return result;
}
