// ================== CONVERSIÓN REAL (USD -> Moneda local) ==================
// Rates actualizados (respaldo si las APIs fallan)
const FALLBACK_RATES = {
  UYU: 39.5, ARS: 1050, BRL: 5.25, CLP: 950, MXN: 18.5,
  COP: 4150, PEN: 3.75, PYG: 7400, BOB: 7, VES: 37,
  CRC: 540, GTQ: 7.9, DOP: 58, HNL: 25, NIO: 37,
  EUR: 0.92
};

function countryToCurrency(country) {
  const map = {
    UY: { code: 'UYU', locale: 'es-UY' },
    AR: { code: 'ARS', locale: 'es-AR' },
    BR: { code: 'BRL', locale: 'pt-BR' },
    CL: { code: 'CLP', locale: 'es-CL' },
    MX: { code: 'MXN', locale: 'es-MX' },
    CO: { code: 'COP', locale: 'es-CO' },
    PE: { code: 'PEN', locale: 'es-PE' },
    PY: { code: 'PYG', locale: 'es-PY' },
    BO: { code: 'BOB', locale: 'es-BO' },
    VE: { code: 'VES', locale: 'es-VE' },
    CR: { code: 'CRC', locale: 'es-CR' },
    GT: { code: 'GTQ', locale: 'es-GT' },
    DO: { code: 'DOP', locale: 'es-DO' },
    HN: { code: 'HNL', locale: 'es-HN' },
    NI: { code: 'NIO', locale: 'es-NI' },
    ES: { code: 'EUR', locale: 'es-ES' },
    FR: { code: 'EUR', locale: 'fr-FR' },
    IT: { code: 'EUR', locale: 'it-IT' },
    US: { code: 'USD', locale: 'en-US' },
  };
  return map[country] || { code: 'USD', locale: 'en-US' };
}

async function getUserCountry() {
  if (window._userCountry) return window._userCountry;
  try {
    const r = await fetch('https://ipapi.co/country/', { timeout: 3000 });
    const code = (await r.text()).trim();
    window._userCountry = code;
    return code;
  } catch (e) {
    console.log('Country detection failed, using UY', e);
    return 'UY';
  }
}

async function getUsdRate(currencyCode) {
  const key = `fx_usd_${currencyCode}_v1`;
  const ttlMs = 12 * 60 * 60 * 1000;
  const now = Date.now();
  
  // Intentar caché primero
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached && cached.rate && cached.ts && (now - cached.ts) < ttlMs) {
      console.log(`Using cached rate for ${currencyCode}: ${cached.rate}`);
      return cached.rate;
    }
  } catch {}
  
  // Intentar múltiples APIs
  const apis = [
    `https://api.exchangerate-api.com/v4/latest/USD`,
    `https://open.er-api.com/v6/latest/USD`,
  ];
  
  for (let apiUrl of apis) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!res.ok) continue;
      const data = await res.json();
      const rate = data?.rates?.[currencyCode] || data?.result?.rates?.[currencyCode];
      
      if (!rate) continue;
      
      try {
        localStorage.setItem(key, JSON.stringify({ rate, ts: now }));
      } catch {}
      
      console.log(`Fetched rate for ${currencyCode}: ${rate} from ${apiUrl}`);
      return rate;
    } catch (e) {
      console.log(`API ${apiUrl} failed:`, e.message);
      continue;
    }
  }
  
  console.log(`All APIs failed for ${currencyCode}, using fallback`);
  // Fallback a rates fijos
  return FALLBACK_RATES[currencyCode] || 1;
}

async function renderLocalTotal(localDiv, totalUsd) {
  if (!localDiv) return;
  
  try {
    const country = await getUserCountry();
    const cur = countryToCurrency(country);
    
    if (cur.code === 'USD') {
      localDiv.textContent = '';
      return;
    }
    
    const rate = await getUsdRate(cur.code);
    const totalLocal = totalUsd * rate;
    const noDecimals = new Set(['CLP', 'PYG', 'COP']);
    const opts = noDecimals.has(cur.code)
      ? { style: 'currency', currency: cur.code, maximumFractionDigits: 0 }
      : { style: 'currency', currency: cur.code, maximumFractionDigits: 2 };
    
    const pretty = totalLocal.toLocaleString(cur.locale, opts);
    localDiv.textContent = `≈ ${pretty} ${cur.code}`;
    console.log(`Rendered: ${localDiv.textContent}`);
  } catch (e) {
    console.error('renderLocalTotal failed:', e);
    localDiv.textContent = '';
  }
}
