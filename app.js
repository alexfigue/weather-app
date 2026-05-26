/* ============================================
   🌦️ EL TIEMPO — App Logic
   PWA Meteorológica · L'Ametlla de Mar
   ============================================ */

// --- Configuration ---
const CONFIG = {
  lat: 40.85,
  lon: 0.85,
  cityName: "L'Ametlla de Mar",
  timezone: 'Europe/Madrid',
  forecastDays: 16,
  pastDays: 2,
  cacheKey: 'weather_cache',
  cacheDuration: 15 * 60 * 1000, // 15 minutes
};

// --- Weather code translations to Spanish ---
const WEATHER_DESCRIPTIONS = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada ligera',
  57: 'Llovizna helada intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada ligera',
  67: 'Lluvia helada intensa',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  77: 'Granizo fino',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos intensos',
  85: 'Nieve ligera intermitente',
  86: 'Nieve intensa intermitente',
  95: 'Tormenta eléctrica',
  96: 'Tormenta con granizo ligero',
  99: 'Tormenta con granizo fuerte',
};

// --- Weather Icons (SVG strings) ---
function getWeatherIcon(code, isDay = true, size = 32) {
  const icons = {
    // Clear sky
    0: isDay
      ? `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="14" fill="#ffd93d" opacity="0.9"><animate attributeName="r" values="14;15;14" dur="3s" repeatCount="indefinite"/></circle><g stroke="#ffd93d" stroke-width="2.5" stroke-linecap="round" opacity="0.7"><line x1="32" y1="6" x2="32" y2="14"><animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/></line><line x1="32" y1="50" x2="32" y2="58"/><line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/><line x1="13.4" y1="13.4" x2="19" y2="19"/><line x1="45" y1="45" x2="50.6" y2="50.6"/><line x1="50.6" y1="13.4" x2="45" y2="19"/><line x1="19" y1="45" x2="13.4" y2="50.6"/></g></svg>`
      : `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><path d="M40 20a16 16 0 1 0-5 31h5a12 12 0 0 0 0-24 12 12 0 0 0-8 3" fill="none" stroke="#c4b5fd" stroke-width="2"/><circle cx="36" cy="28" r="12" fill="#c4b5fd" opacity="0.8"><animate attributeName="opacity" values="0.8;1;0.8" dur="4s" repeatCount="indefinite"/></circle></svg>`,
    // Mainly clear
    1: isDay
      ? `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><circle cx="26" cy="28" r="11" fill="#ffd93d" opacity="0.85"/><g stroke="#ffd93d" stroke-width="2" stroke-linecap="round" opacity="0.5"><line x1="26" y1="10" x2="26" y2="15"/><line x1="26" y1="41" x2="26" y2="46"/><line x1="10" y1="28" x2="15" y2="28"/><line x1="37" y1="28" x2="42" y2="28"/></g><path d="M34 38c0-6.6 5.4-12 12-12a12 12 0 0 1 6 1.6A10 10 0 0 0 42 22a10 10 0 0 0-9.7 7.6A8 8 0 0 0 34 38z" fill="white" opacity="0.5"/></svg>`
      : `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><circle cx="30" cy="26" r="10" fill="#c4b5fd" opacity="0.7"/><path d="M38 40c0-5 4-9 9-9a9 9 0 0 1 5 1.5A8 8 0 0 0 42 26a8 8 0 0 0-7.5 5.3A7 7 0 0 0 38 40z" fill="white" opacity="0.3"/></svg>`,
    // Partly cloudy
    2: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><circle cx="22" cy="24" r="10" fill="#ffd93d" opacity="0.7"/><path d="M26 44a10 10 0 0 1 10-10h2a8 8 0 0 1 8 8 8 8 0 0 1-8 8H30a6 6 0 0 1-4-6z" fill="white" opacity="0.6"><animate attributeName="opacity" values="0.6;0.75;0.6" dur="4s" repeatCount="indefinite"/></path><ellipse cx="38" cy="42" rx="14" ry="8" fill="white" opacity="0.45"/></svg>`,
    // Overcast
    3: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="38" rx="20" ry="10" fill="white" opacity="0.35"/><ellipse cx="28" cy="32" rx="16" ry="10" fill="white" opacity="0.45"><animate attributeName="opacity" values="0.45;0.55;0.45" dur="5s" repeatCount="indefinite"/></ellipse><ellipse cx="38" cy="34" rx="14" ry="9" fill="white" opacity="0.4"/></svg>`,
    // Fog
    45: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><g stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.4"><line x1="12" y1="24" x2="52" y2="24"><animate attributeName="x1" values="12;16;12" dur="4s" repeatCount="indefinite"/></line><line x1="8" y1="32" x2="56" y2="32"><animate attributeName="x1" values="8;12;8" dur="5s" repeatCount="indefinite"/></line><line x1="14" y1="40" x2="50" y2="40"><animate attributeName="x1" values="14;10;14" dur="4.5s" repeatCount="indefinite"/></line></g></svg>`,
    48: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><g stroke="#c4b5fd" stroke-width="2.5" stroke-linecap="round" opacity="0.4"><line x1="12" y1="24" x2="52" y2="24"/><line x1="8" y1="32" x2="56" y2="32"/><line x1="14" y1="40" x2="50" y2="40"/></g></svg>`,
    // Drizzle
    51: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="26" rx="16" ry="10" fill="white" opacity="0.4"/><g stroke="#6cb4ee" stroke-width="1.5" stroke-linecap="round" opacity="0.6"><line x1="22" y1="40" x2="20" y2="46"><animate attributeName="y1" values="40;42;40" dur="1.5s" repeatCount="indefinite"/></line><line x1="32" y1="42" x2="30" y2="48"><animate attributeName="y1" values="42;44;42" dur="1.8s" repeatCount="indefinite"/></line><line x1="42" y1="40" x2="40" y2="46"><animate attributeName="y1" values="40;42;40" dur="1.3s" repeatCount="indefinite"/></line></g></svg>`,
    // Rain
    61: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="22" rx="18" ry="11" fill="white" opacity="0.4"/><g stroke="#6cb4ee" stroke-width="2" stroke-linecap="round" opacity="0.7"><line x1="20" y1="38" x2="17" y2="48"><animate attributeName="y1" values="38;40;38" dur="0.8s" repeatCount="indefinite"/></line><line x1="28" y1="36" x2="25" y2="46"><animate attributeName="y1" values="36;38;36" dur="1s" repeatCount="indefinite"/></line><line x1="36" y1="38" x2="33" y2="48"><animate attributeName="y1" values="38;40;38" dur="0.9s" repeatCount="indefinite"/></line><line x1="44" y1="36" x2="41" y2="46"><animate attributeName="y1" values="36;38;36" dur="1.1s" repeatCount="indefinite"/></line></g></svg>`,
    // Heavy rain
    65: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="20" rx="18" ry="11" fill="#8e99a4" opacity="0.5"/><g stroke="#6cb4ee" stroke-width="2.5" stroke-linecap="round" opacity="0.8"><line x1="18" y1="36" x2="14" y2="50"><animate attributeName="y2" values="50;52;50" dur="0.6s" repeatCount="indefinite"/></line><line x1="26" y1="34" x2="22" y2="48"><animate attributeName="y2" values="48;50;48" dur="0.7s" repeatCount="indefinite"/></line><line x1="34" y1="36" x2="30" y2="50"><animate attributeName="y2" values="50;52;50" dur="0.65s" repeatCount="indefinite"/></line><line x1="42" y1="34" x2="38" y2="48"><animate attributeName="y2" values="48;50;48" dur="0.75s" repeatCount="indefinite"/></line></g></svg>`,
    // Snow
    71: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="22" rx="18" ry="11" fill="white" opacity="0.4"/><g fill="#e8e8ff" opacity="0.8"><circle cx="22" cy="40" r="2.5"><animate attributeName="cy" values="40;48;40" dur="3s" repeatCount="indefinite"/></circle><circle cx="32" cy="44" r="2"><animate attributeName="cy" values="44;52;44" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="42" cy="42" r="2.5"><animate attributeName="cy" values="42;50;42" dur="3.5s" repeatCount="indefinite"/></circle></g></svg>`,
    // Thunderstorm
    95: `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="18" rx="20" ry="12" fill="#8e99a4" opacity="0.5"/><path d="M30 30l-4 12h8l-4 12" stroke="#ffd93d" stroke-width="2.5" fill="none" stroke-linejoin="round"><animate attributeName="opacity" values="1;0.3;1;0.3;1" dur="2s" repeatCount="indefinite"/></path><g stroke="#6cb4ee" stroke-width="1.5" stroke-linecap="round" opacity="0.5"><line x1="18" y1="34" x2="16" y2="42"/><line x1="46" y1="34" x2="44" y2="42"/></g></svg>`,
  };

  // Map similar codes to existing icons
  const codeMap = {
    0: 0, 1: 1, 2: 2, 3: 3,
    45: 45, 48: 48,
    51: 51, 53: 51, 55: 51,
    56: 51, 57: 51,
    61: 61, 63: 61, 66: 61,
    65: 65, 67: 65,
    71: 71, 73: 71, 75: 71, 77: 71,
    80: 61, 81: 61, 82: 65,
    85: 71, 86: 71,
    95: 95, 96: 95, 99: 95,
  };

  const mappedCode = codeMap[code] ?? 3;
  return icons[mappedCode] || icons[3];
}

// --- Wind direction in Spanish ---
function getWindDirection(degrees) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

// --- AQI description in Spanish ---
function getAQIInfo(aqi) {
  if (aqi <= 20) return { text: 'Buena', class: 'good' };
  if (aqi <= 40) return { text: 'Aceptable', class: 'moderate' };
  if (aqi <= 60) return { text: 'Moderada', class: 'moderate' };
  if (aqi <= 80) return { text: 'Mala', class: 'poor' };
  if (aqi <= 100) return { text: 'Muy mala', class: 'very-poor' };
  return { text: 'Extrema', class: 'extreme' };
}

// --- Date formatting in Spanish ---
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
}

function formatDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dStr = d.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dStr === todayStr) return { name: 'Hoy', sub: formatDate(dateStr), isToday: true, isYesterday: false };
  if (dStr === yesterdayStr) return { name: 'Ayer', sub: formatDate(dateStr), isToday: false, isYesterday: true };
  if (dStr === tomorrowStr) return { name: 'Mañana', sub: formatDate(dateStr), isToday: false, isYesterday: false };
  return { name: DAYS_ES[d.getDay()], sub: formatDate(dateStr), isToday: false, isYesterday: false };
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getCurrentDateFormatted() {
  const now = new Date();
  const dayName = DAYS_ES[now.getDay()];
  const day = now.getDate();
  const month = MONTHS_ES[now.getMonth()];
  return `${dayName}, ${day} de ${month}`;
}

// --- Determine if it's daytime ---
function isDaytime(sunrise, sunset) {
  const now = new Date();
  const sr = new Date(sunrise);
  const ss = new Date(sunset);
  return now >= sr && now <= ss;
}

// --- API Calls ---
async function fetchWeatherData() {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}` +
    `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index,pressure_msl,visibility,dew_point_2m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max` +
    `&past_days=${CONFIG.pastDays}&forecast_days=${CONFIG.forecastDays}` +
    `&timezone=${CONFIG.timezone}`;

  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}` +
    `&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi` +
    `&timezone=${CONFIG.timezone}&forecast_days=1&past_days=0`;

  const [weatherRes, airRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(airUrl),
  ]);

  if (!weatherRes.ok) throw new Error(`Error de red: ${weatherRes.status}`);

  const weather = await weatherRes.json();
  const air = airRes.ok ? await airRes.json() : null;

  return { weather, air };
}

// --- Find current hour index ---
function getCurrentHourIndex(times) {
  const now = new Date();
  const nowHour = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + 'T' +
    String(now.getHours()).padStart(2, '0') + ':00';

  let closest = 0;
  let minDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]) - now);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  return closest;
}

// --- Find today's daily index ---
function getTodayDailyIndex(dates) {
  const todayStr = new Date().toISOString().split('T')[0];
  return dates.indexOf(todayStr);
}

// --- Cache management ---
function getCachedData() {
  try {
    const cached = localStorage.getItem(CONFIG.cacheKey);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CONFIG.cacheDuration) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedData(data) {
  try {
    localStorage.setItem(CONFIG.cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // Storage full or unavailable
  }
}

// --- SVG Icons for detail items ---
const DETAIL_ICONS = {
  humidity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`,
  pressure: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  uv: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  dewpoint: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M8 14a4 4 0 0 0 8 0"/></svg>`,
  visibility: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  sunrise: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><polyline points="8 2 12 6 16 2"/></svg>`,
  sunset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><polyline points="8 6 12 2 16 6"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  location: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

// --- Main render function ---
function renderApp(data) {
  const { weather, air } = data;
  const h = weather.hourly;
  const d = weather.daily;

  const nowIdx = getCurrentHourIndex(h.time);
  const todayIdx = getTodayDailyIndex(d.time);
  const isDay = todayIdx >= 0 ? isDaytime(d.sunrise[todayIdx], d.sunset[todayIdx]) : true;

  // Toggle body class for day/night theme
  document.body.classList.toggle('daytime', isDay);

  const app = document.getElementById('app');

  // --- Current weather data ---
  const currentTemp = Math.round(h.temperature_2m[nowIdx]);
  const currentFeels = Math.round(h.apparent_temperature[nowIdx]);
  const currentCode = h.weather_code[nowIdx];
  const currentDesc = WEATHER_DESCRIPTIONS[currentCode] || 'Desconocido';
  const todayMax = todayIdx >= 0 ? Math.round(d.temperature_2m_max[todayIdx]) : '--';
  const todayMin = todayIdx >= 0 ? Math.round(d.temperature_2m_min[todayIdx]) : '--';

  // --- Details ---
  const humidity = Math.round(h.relative_humidity_2m[nowIdx]);
  const windSpeed = Math.round(h.wind_speed_10m[nowIdx]);
  const windDir = getWindDirection(h.wind_direction_10m[nowIdx]);
  const pressure = Math.round(h.pressure_msl[nowIdx]);
  const uvIndex = h.uv_index[nowIdx] != null ? h.uv_index[nowIdx].toFixed(1) : '--';
  const dewPoint = Math.round(h.dew_point_2m[nowIdx]);
  const visibility = h.visibility[nowIdx] != null ? (h.visibility[nowIdx] / 1000).toFixed(1) : '--';

  // --- Sunrise / Sunset ---
  const sunrise = todayIdx >= 0 ? formatTime(d.sunrise[todayIdx]) : '--:--';
  const sunset = todayIdx >= 0 ? formatTime(d.sunset[todayIdx]) : '--:--';

  // --- Hourly forecast (next 24h from now) ---
  let hourlyHTML = '';
  for (let i = 0; i < 25 && (nowIdx + i) < h.time.length; i++) {
    const idx = nowIdx + i;
    const isNow = i === 0;
    const time = isNow ? 'Ahora' : formatTime(h.time[idx]);
    const temp = Math.round(h.temperature_2m[idx]);
    const code = h.weather_code[idx];
    const precip = h.precipitation_probability[idx];

    hourlyHTML += `
      <div class="hourly-item ${isNow ? 'now' : ''}" style="animation-delay: ${i * 0.03}s">
        <div class="hourly-item__time">${time}</div>
        <div class="hourly-item__icon">${getWeatherIcon(code, isDay, 28)}</div>
        <div class="hourly-item__temp">${temp}°</div>
        <div class="hourly-item__precip">${precip > 0 ? precip + '%' : ''}</div>
      </div>
    `;
  }

  // --- Weekly forecast ---
  let weeklyHTML = '';
  for (let i = 0; i < d.time.length; i++) {
    const dayInfo = formatDayName(d.time[i]);
    const code = d.weather_code[i];
    const max = Math.round(d.temperature_2m_max[i]);
    const min = Math.round(d.temperature_2m_min[i]);
    const precip = d.precipitation_probability_max[i] || 0;

    const classes = [
      'weekly-item',
      dayInfo.isToday ? 'today' : '',
      dayInfo.isYesterday ? 'yesterday' : '',
    ].filter(Boolean).join(' ');

    weeklyHTML += `
      <div class="${classes}" style="animation-delay: ${i * 0.04}s">
        <div class="weekly-item__day">
          ${dayInfo.name}
          <span class="weekly-item__day-sub">${dayInfo.sub}</span>
        </div>
        <div class="weekly-item__icon">${getWeatherIcon(code, true, 32)}</div>
        <div class="weekly-item__precip">${precip > 0 ? '💧 ' + precip + '%' : ''}</div>
        <div class="weekly-item__temps">
          <span class="weekly-item__temp-low">${min}°</span>
          <div class="weekly-item__temp-bar"></div>
          <span class="weekly-item__temp-high">${max}°</span>
        </div>
      </div>
    `;
  }

  // --- Air Quality ---
  let airHTML = '';
  if (air && air.hourly) {
    const aq = air.hourly;
    const aqIdx = getCurrentHourIndex(aq.time);
    const aqi = aq.european_aqi ? aq.european_aqi[aqIdx] : null;
    const aqiInfo = aqi != null ? getAQIInfo(aqi) : { text: 'No disponible', class: 'moderate' };
    const aqiPercent = aqi != null ? Math.min(aqi / 120 * 100, 100) : 0;

    const pm25 = aq.pm2_5 ? (aq.pm2_5[aqIdx] ?? '--') : '--';
    const pm10 = aq.pm10 ? (aq.pm10[aqIdx] ?? '--') : '--';
    const no2 = aq.nitrogen_dioxide ? (aq.nitrogen_dioxide[aqIdx] ?? '--') : '--';
    const so2 = aq.sulphur_dioxide ? (aq.sulphur_dioxide[aqIdx] ?? '--') : '--';
    const o3 = aq.ozone ? (aq.ozone[aqIdx] ?? '--') : '--';
    const co = aq.carbon_monoxide ? (aq.carbon_monoxide[aqIdx] ?? '--') : '--';

    airHTML = `
      <section class="air-quality-section" id="air-quality">
        <h2 class="section-title">Calidad del Aire</h2>
        <div class="glass-card">
          <div class="aqi-header">
            <span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">Índice AQI Europeo</span>
            <span class="aqi-badge aqi-badge--${aqiInfo.class}">
              <span class="aqi-dot"></span>
              ${aqi != null ? aqi : '--'} · ${aqiInfo.text}
            </span>
          </div>
          <div class="aqi-bar">
            <div class="aqi-bar__marker" style="left: ${aqiPercent}%"></div>
          </div>
          <div class="pollutants-grid">
            <div class="pollutant-item" style="animation-delay:0.05s">
              <div class="pollutant-item__label">PM2.5</div>
              <div class="pollutant-item__value">${typeof pm25 === 'number' ? pm25.toFixed(1) : pm25}</div>
              <div class="pollutant-item__unit">µg/m³</div>
            </div>
            <div class="pollutant-item" style="animation-delay:0.1s">
              <div class="pollutant-item__label">PM10</div>
              <div class="pollutant-item__value">${typeof pm10 === 'number' ? pm10.toFixed(1) : pm10}</div>
              <div class="pollutant-item__unit">µg/m³</div>
            </div>
            <div class="pollutant-item" style="animation-delay:0.15s">
              <div class="pollutant-item__label">NO₂</div>
              <div class="pollutant-item__value">${typeof no2 === 'number' ? no2.toFixed(1) : no2}</div>
              <div class="pollutant-item__unit">µg/m³</div>
            </div>
            <div class="pollutant-item" style="animation-delay:0.2s">
              <div class="pollutant-item__label">SO₂</div>
              <div class="pollutant-item__value">${typeof so2 === 'number' ? so2.toFixed(1) : so2}</div>
              <div class="pollutant-item__unit">µg/m³</div>
            </div>
            <div class="pollutant-item" style="animation-delay:0.25s">
              <div class="pollutant-item__label">O₃</div>
              <div class="pollutant-item__value">${typeof o3 === 'number' ? o3.toFixed(1) : o3}</div>
              <div class="pollutant-item__unit">µg/m³</div>
            </div>
            <div class="pollutant-item" style="animation-delay:0.3s">
              <div class="pollutant-item__label">CO</div>
              <div class="pollutant-item__value">${typeof co === 'number' ? co.toFixed(0) : co}</div>
              <div class="pollutant-item__unit">µg/m³</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // --- Build full app HTML ---
  app.innerHTML = `
    <!-- Header -->
    <header class="header" id="header">
      <div class="header__location">
        <span class="header__location-icon">${DETAIL_ICONS.location}</span>
        <div>
          <div class="header__city">${CONFIG.cityName}</div>
          <div class="header__date">${getCurrentDateFormatted()}</div>
        </div>
      </div>
      <button class="header__refresh" id="btn-refresh" aria-label="Actualizar datos" title="Actualizar datos">
        ${DETAIL_ICONS.refresh}
      </button>
    </header>

    <!-- Current Weather -->
    <section class="current-weather glass-card" id="current-weather">
      <div class="current-weather__icon">${getWeatherIcon(currentCode, isDay, 100)}</div>
      <div class="current-weather__temp">${currentTemp}<sup>°C</sup></div>
      <div class="current-weather__description">${currentDesc}</div>
      <div class="current-weather__feels-like">Sensación térmica: ${currentFeels}°C</div>
      <div class="current-weather__high-low">
        <span class="current-weather__high">▲ ${todayMax}°</span>
        <span class="current-weather__low">▼ ${todayMin}°</span>
      </div>
    </section>

    <!-- Detail Metrics -->
    <section id="details">
      <h2 class="section-title">Detalles</h2>
      <div class="details-grid glass-card">
        <div class="detail-item">
          <div class="detail-item__icon">${DETAIL_ICONS.humidity}</div>
          <div class="detail-item__value">${humidity}%</div>
          <div class="detail-item__label">Humedad</div>
        </div>
        <div class="detail-item">
          <div class="detail-item__icon">${DETAIL_ICONS.wind}</div>
          <div class="detail-item__value">${windSpeed} <small>km/h</small></div>
          <div class="detail-item__label">Viento ${windDir}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item__icon">${DETAIL_ICONS.pressure}</div>
          <div class="detail-item__value">${pressure}</div>
          <div class="detail-item__label">Presión hPa</div>
        </div>
        <div class="detail-item">
          <div class="detail-item__icon">${DETAIL_ICONS.uv}</div>
          <div class="detail-item__value">${uvIndex}</div>
          <div class="detail-item__label">Índice UV</div>
        </div>
        <div class="detail-item">
          <div class="detail-item__icon">${DETAIL_ICONS.dewpoint}</div>
          <div class="detail-item__value">${dewPoint}°</div>
          <div class="detail-item__label">Pto. Rocío</div>
        </div>
        <div class="detail-item">
          <div class="detail-item__icon">${DETAIL_ICONS.visibility}</div>
          <div class="detail-item__value">${visibility}</div>
          <div class="detail-item__label">Visib. km</div>
        </div>
      </div>
    </section>

    <!-- Sun Times -->
    <section id="sun-times">
      <h2 class="section-title">Sol</h2>
      <div class="sun-times glass-card">
        <div class="sun-times__item">
          <div class="sun-times__icon sun-times__icon--rise">${DETAIL_ICONS.sunrise}</div>
          <div class="sun-times__info">
            <span class="sun-times__label">Amanecer</span>
            <span class="sun-times__time">${sunrise}</span>
          </div>
        </div>
        <div class="sun-times__divider"></div>
        <div class="sun-times__item">
          <div class="sun-times__icon sun-times__icon--set">${DETAIL_ICONS.sunset}</div>
          <div class="sun-times__info">
            <span class="sun-times__label">Atardecer</span>
            <span class="sun-times__time">${sunset}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Hourly Forecast -->
    <section class="hourly-section" id="hourly">
      <h2 class="section-title">Próximas Horas</h2>
      <div class="hourly-scroll">${hourlyHTML}</div>
    </section>

    <!-- Weekly Forecast -->
    <section class="weekly-section" id="weekly">
      <h2 class="section-title">Predicción Extendida</h2>
      <div class="weekly-list">${weeklyHTML}</div>
    </section>

    <!-- Air Quality -->
    ${airHTML}

    <!-- Last Updated -->
    <div class="last-updated" id="last-updated">
      Última actualización: ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
    </div>
  `;

  // --- Bind refresh button ---
  document.getElementById('btn-refresh').addEventListener('click', () => {
    localStorage.removeItem(CONFIG.cacheKey);
    loadApp(true);
  });
}

// --- Main load function ---
async function loadApp(forceRefresh = false) {
  const loadingScreen = document.getElementById('loading-screen');
  const app = document.getElementById('app');

  // Show loading if fresh load
  if (!forceRefresh) {
    loadingScreen.classList.remove('hidden');
  }

  // Spinning refresh button if available
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) refreshBtn.classList.add('spinning');

  try {
    // Try cache first
    let data = null;
    let expiredData = null;

    if (!forceRefresh) {
      data = getCachedData();
    }

    // Si no tenim dades fresques, mirem si hi ha dades caducades per si falla la xarxa
    if (!data) {
      try {
        const cachedRaw = localStorage.getItem(CONFIG.cacheKey);
        if (cachedRaw) {
          expiredData = JSON.parse(cachedRaw).data;
        }
      } catch (e) { }

      try {
        data = await fetchWeatherData();
        setCachedData(data);
      } catch (err) {
        if (expiredData) {
          console.warn('Error de xarxa (ex. Too Many Requests). Fent servir dades de la memòria cau caducades.', err);
          data = expiredData;
        } else {
          throw err;
        }
      }
    }

    renderApp(data);

    // Hide loading screen
    loadingScreen.classList.add('hidden');

  } catch (error) {
    console.error('Error cargando datos:', error);
    loadingScreen.classList.add('hidden');

    app.innerHTML = `
      <div class="glass-card error-card">
        <div class="error-card__icon">⚠️</div>
        <div class="error-card__title">Error de conexión</div>
        <div class="error-card__message">No se pudieron cargar los datos meteorológicos. Comprueba tu conexión a internet.</div>
        <button class="error-card__retry" id="btn-retry">Reintentar</button>
      </div>
    `;

    document.getElementById('btn-retry').addEventListener('click', () => loadApp(true));
  }
}

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado:', reg.scope))
      .catch(err => console.log('Service Worker error:', err));
  });
}

// --- PWA Install ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('show');
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      const banner = document.getElementById('install-banner');
      if (banner) banner.classList.remove('show');
    });
  }
}

function dismissInstall() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('show');
}

// --- Auto-refresh every 15 minutes ---
let autoRefreshInterval = null;

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    console.log('Auto-refresh triggered');
    loadApp(true);
  }, CONFIG.cacheDuration);
}

// --- Refresh when app becomes visible again ---
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // If cache is expired, refresh
    const cached = getCachedData();
    if (!cached) {
      console.log('Visibility refresh: cache expired');
      loadApp(true);
    }
  }
});

// --- Pull-to-refresh (touch gesture) ---
let touchStartY = 0;
let isPulling = false;

document.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0) {
    touchStartY = e.touches[0].clientY;
    isPulling = true;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!isPulling) return;
  const touchY = e.touches[0].clientY;
  const diff = touchY - touchStartY;

  if (diff > 120 && window.scrollY === 0) {
    isPulling = false;
    // Visual feedback
    const app = document.getElementById('app');
    if (app) {
      app.style.transition = 'transform 0.3s ease';
      app.style.transform = 'translateY(20px)';
      setTimeout(() => {
        app.style.transform = '';
        setTimeout(() => { app.style.transition = ''; }, 300);
      }, 300);
    }
    loadApp(true);
  }
}, { passive: true });

document.addEventListener('touchend', () => {
  isPulling = false;
}, { passive: true });

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadApp();
  startAutoRefresh();
});
