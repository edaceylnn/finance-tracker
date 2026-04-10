import express from 'express';
import RecurringRecord from '../models/RecurringRecord';
import Record from '../models/Record';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

function advanceNextDate(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case 'daily':   d.setDate(d.getDate() + 1); break;
    case 'weekly':  d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

const LOCK_NEXT_DATE = new Date('2099-12-31T23:59:59.999Z');

router.get('/', async (req, res) => {
  try {
    const records = await RecurringRecord.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    console.error('[GET /recurring-records]', err);
    res.status(500).json({ error: 'Tekrarlayan kayıtlar getirilemedi' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, amount, category, type, currency, frequency, startDate } = req.body as Record<string, unknown>;
    if (!title || !amount || !category || !frequency) {
      return res.status(400).json({ error: 'title, amount, category ve frequency zorunludur' });
    }
    const start = startDate ? new Date(String(startDate)) : new Date();
    const record = new RecurringRecord({
      userId: req.userId,
      title,
      amount: Math.abs(Number(amount)),
      category,
      type: type || 'expense',
      currency: currency || 'TRY',
      frequency,
      startDate: start,
      nextDate: start,
    });
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    console.error('[POST /recurring-records]', err);
    res.status(500).json({ error: 'Tekrarlayan kayıt oluşturulamadı' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const rec = await RecurringRecord.findOne({ _id: req.params.id, userId: req.userId });
    if (!rec) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    const body = req.body as Record<string, unknown>;
    const keys = ['title', 'amount', 'category', 'type', 'currency', 'frequency', 'isActive'] as const;
    keys.forEach((k) => {
      if (body[k] !== undefined) {
        (rec as unknown as Record<string, unknown>)[k] = body[k];
      }
    });
    if (body.amount !== undefined) rec.amount = Math.abs(Number(body.amount));
    await rec.save();
    res.json(rec);
  } catch (err) {
    console.error('[PUT /recurring-records/:id]', err);
    res.status(500).json({ error: 'Tekrarlayan kayıt güncellenemedi' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const rec = await RecurringRecord.findOne({ _id: req.params.id, userId: req.userId });
    if (!rec) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    await rec.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /recurring-records/:id]', err);
    res.status(500).json({ error: 'Tekrarlayan kayıt silinemedi' });
  }
});

router.post('/process', async (req, res) => {
  try {
    const now = new Date();
    let processed = 0;
    let created = 0;

    for (;;) {
      const candidate = await RecurringRecord.findOne({
        userId:   req.userId,
        isActive: true,
        nextDate: { $lte: now },
      }).sort({ nextDate: 1 });

      if (!candidate) break;

      const locked = await RecurringRecord.findOneAndUpdate(
        {
          _id:      candidate._id,
          userId:   req.userId,
          nextDate: candidate.nextDate,
        },
        { $set: { nextDate: LOCK_NEXT_DATE } },
        { new: true },
      );

      if (!locked) continue;

      processed += 1;
      const freq = candidate.frequency;
      let next = new Date(candidate.nextDate as Date);

      while (next <= now) {
        const newRecord = new Record({
          userId:   candidate.userId,
          title:    candidate.title,
          amount:   candidate.amount,
          category: candidate.category,
          type:     candidate.type,
          currency: candidate.currency,
          date:     new Date(next),
        });
        await newRecord.save();
        created += 1;
        next = advanceNextDate(next, freq);
      }

      await RecurringRecord.updateOne({ _id: candidate._id }, { $set: { nextDate: next } });
    }

    res.json({ processed, created });
  } catch (err) {
    console.error('[POST /recurring-records/process]', err);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

export default router;
