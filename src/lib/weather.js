const LAT = 25.07;
const LON = 91.00;

let cache = null;

export async function fetchWeather() {
    if (cache) return cache;

    try {
        const url =
            `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${LAT}&longitude=${LON}` +
            `&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m` +
            `&daily=precipitation_sum&forecast_days=3&timezone=Asia%2FDhaka`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        const daily = data.daily?.precipitation_sum || [];
        const rainfall72h = daily.reduce((a, v) => a + (v || 0), 0);
        const hourIdx = Math.min(new Date().getHours(), (data.hourly?.temperature_2m?.length || 1) - 1);

        cache = {
            rainfall72h: parseFloat(rainfall72h.toFixed(1)),
            temp: parseFloat((data.hourly?.temperature_2m?.[hourIdx] ?? 28.5).toFixed(1)),
            humidity: parseInt((data.hourly?.relativehumidity_2m?.[hourIdx] ?? 76).toFixed(0)),
            wind: parseFloat((data.hourly?.windspeed_10m?.[hourIdx] ?? 16).toFixed(1)),
            source: 'Open-Meteo API (live)',
            fetchedAt: new Date(),
        };
    } catch (_) {
        // Realistic monsoon fallback for Sunamganj, Sylhet
        cache = {
            rainfall72h: 47.2,
            temp: 29.3,
            humidity: 84,
            wind: 18.5,
            source: 'Fallback (API unavailable)',
            fetchedAt: new Date(),
        };
    }

    return cache;
}

export function clearWeatherCache() {
    cache = null;
}
