import express from 'express';
import Record from '../models/Record';
import { authMiddleware } from '../middleware/auth';
import { normalizeRecordDate } from '../utils/date';

const router = express.Router();

const ALLOWED_CURRENCIES = new Set(['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY']);

function normalizeCurrency(raw: unknown): string | null {
  if (raw == null || String(raw).trim() === '') return 'TRY';
  const code = String(raw).trim().toUpperCase();
  if (!ALLOWED_CURRENCIES.has(code)) return null;
  return code;
}

router.use(authMiddleware);

function escapeRegex(s: string): string {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAmountRange(minRaw: unknown, maxRaw: unknown): { $gte?: number; $lte?: number } | null {
  const out: { $gte?: number; $lte?: number } = {};
  if (minRaw != null && String(minRaw).trim() !== '') {
    const n = Number(String(minRaw).replace(',', '.'));
    if (!Number.isNaN(n) && n >= 0) out.$gte = n;
  }
  if (maxRaw != null && String(maxRaw).trim() !== '') {
    const n = Number(String(maxRaw).replace(',', '.'));
    if (!Number.isNaN(n) && n >= 0) out.$lte = n;
  }
  return Object.keys(out).length ? out : null;
}

router.get('/', async (req, res) => {
  try {
    const filter: Record<string, unknown> = { userId: req.userId };
    if (req.query.type) filter.type = req.query.type;

    const q = String(req.query.q || req.query.search || '').trim();
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { category: { $regex: safe, $options: 'i' } },
      ];
    }

    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    if (dateFrom || dateTo) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (dateFrom) dateFilter.$gte = normalizeRecordDate(dateFrom);
      if (dateTo) {
        const end = normalizeRecordDate(dateTo);
        const endDay = new Date(end);
        endDay.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDay;
      }
      filter.date = dateFilter;
    }

    const amountRange = buildAmountRange(req.query.amountMin, req.query.amountMax);
    if (amountRange) filter.amount = amountRange;

    const cats = req.query.categories;
    if (cats != null && String(cats).trim() !== '') {
      const list = String(cats).split(',').map(c => c.trim()).filter(Boolean);
      if (list.length) filter.category = { $in: list };
    }

    if (req.query.currency) filter.currency = req.query.currency;

    const records = await Record.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch (err) {
    console.error('[GET /records]', err);
    res.status(500).json({ error: 'Kayıtlar getirilemedi' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, amount, category, type, date, currency } = req.body as Record<string, unknown>;
    if (!title || !amount || !category) {
      return res.status(400).json({ error: 'title, amount ve category zorunludur' });
    }
    const cur = normalizeCurrency(currency);
    if (cur == null) {
      return res.status(400).json({ error: 'Geçersiz para birimi' });
    }
    const record = new Record({
      userId:   req.userId,
      title,
      amount:   Math.abs(Number(amount)),
      category,
      type:     type || 'expense',
      currency: cur,
      date:     normalizeRecordDate(date),
    });
    await record.save();
    res.json(record);
  } catch (err) {
    console.error('[POST /records]', err);
    res.status(500).json({ error: 'Kayıt eklenemedi' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, userId: req.userId });
    if (!record) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    const { title, amount, category, type, date, currency } = req.body as Record<string, unknown>;
    if (title    !== undefined) record.title    = title as string;
    if (amount   !== undefined) record.amount   = Math.abs(Number(amount));
    if (category !== undefined) record.category = category as string;
    if (type     !== undefined) record.type     = type as 'expense' | 'investment' | 'income';
    if (date     !== undefined) record.date     = normalizeRecordDate(date);
    if (currency !== undefined) {
      const cur = normalizeCurrency(currency);
      if (cur == null) {
        return res.status(400).json({ error: 'Geçersiz para birimi' });
      }
      record.currency = cur;
    }
    await record.save();
    res.json(record);
  } catch (err) {
    console.error('[PUT /records/:id]', err);
    res.status(500).json({ error: 'Kayıt güncellenemedi' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, userId: req.userId });
    if (!record) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    await record.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /records/:id]', err);
    res.status(500).json({ error: 'Kayıt silinemedi' });
  }
});

export default router;
