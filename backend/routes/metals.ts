import express from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);
router.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `metals:${req.userId}`,
}));

const GRAMS_PER_TROY_OZ = 31.1034768;

type CacheEntry = { dayKey: string | null; payload: Record<string, unknown> | null };
let cache: CacheEntry = { dayKey: null, payload: null };

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type MetalpriceError = Error & { code?: string };

async function fetchFromMetalprice(): Promise<Record<string, unknown>> {
  const key = process.env.METALPRICE_API_KEY;
  if (!key || String(key).trim() === '') {
    const err = new Error('METALPRICE_API_KEY is not set') as MetalpriceError;
    err.code = 'NO_KEY';
    throw err;
  }

  const url = new URL('https://api.metalpriceapi.com/v1/latest');
  url.searchParams.set('api_key', String(key).trim());
  url.searchParams.set('base', 'USD');
  url.searchParams.set('currencies', 'XAU,XAG,TRY');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: { info?: string };
    rates?: Record<string, number>;
    base?: string;
    timestamp?: number;
  };

  if (!data.success) {
    const msg = data.error?.info || 'MetalpriceAPI request failed';
    const err = new Error(msg) as MetalpriceError;
    err.code = 'UPSTREAM';
    throw err;
  }

  const r = data.rates || {};
  const tryPerUsd = Number(r.TRY);
  const usdPerOzGold = r.USDXAU != null
    ? Number(r.USDXAU)
    : (r.XAU != null && Number(r.XAU) > 0 ? 1 / Number(r.XAU) : null);
  const usdPerOzSilver = r.USDXAG != null
    ? Number(r.USDXAG)
    : (r.XAG != null && Number(r.XAG) > 0 ? 1 / Number(r.XAG) : null);

  let goldTryPerGram: number | null = null;
  let silverTryPerGram: number | null = null;
  if (usdPerOzGold != null && !Number.isNaN(usdPerOzGold) && !Number.isNaN(tryPerUsd) && tryPerUsd > 0) {
    goldTryPerGram = (usdPerOzGold * tryPerUsd) / GRAMS_PER_TROY_OZ;
  }
  if (usdPerOzSilver != null && !Number.isNaN(usdPerOzSilver) && !Number.isNaN(tryPerUsd) && tryPerUsd > 0) {
    silverTryPerGram = (usdPerOzSilver * tryPerUsd) / GRAMS_PER_TROY_OZ;
  }

  return {
    base:           data.base || 'USD',
    timestamp:      data.timestamp,
    usdPerOzGold,
    usdPerOzSilver,
    tryPerUsd:      Number.isNaN(tryPerUsd) ? null : tryPerUsd,
    goldTryPerGram,
    silverTryPerGram,
    fetchedAt:      new Date().toISOString(),
    dataDelayNote:  'Planınıza göre gecikmeli veri (ücretsiz planda günlük).',
    sourceName:     'MetalpriceAPI',
    sourceUrl:      'https://www.metalpriceapi.com/',
  };
}

router.get('/', async (_req, res) => {
  try {
    const today = utcDayKey();
    if (cache.payload && cache.dayKey === today) {
      return res.json({ ...cache.payload, cached: true });
    }

    const payload = await fetchFromMetalprice();
    cache = { dayKey: today, payload };
    res.json({ ...payload, cached: false });
  } catch (err: unknown) {
    const e = err as MetalpriceError;
    console.error('[GET /metals]', e.message || err);
    if (e.code === 'NO_KEY') {
      return res.status(503).json({ error: 'Metal fiyatları yapılandırılmadı' });
    }
    if (cache.payload) {
      return res.json({ ...cache.payload, cached: true, stale: true });
    }
    res.status(503).json({ error: 'Metal fiyatları alınamadı' });
  }
});

export default router;
