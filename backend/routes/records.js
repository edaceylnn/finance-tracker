const express = require('express');
const Record = require('../models/Record');
const { authMiddleware } = require('../middleware/auth');
const { normalizeRecordDate } = require('../utils/date');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.type) filter.type = req.query.type;
    const records = await Record.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch {
    res.status(500).json({ error: 'Kayıtlar getirilemedi' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, amount, category, type, date } = req.body;
    if (!title || !amount || !category) {
      return res.status(400).json({ error: 'title, amount ve category zorunludur' });
    }
    const record = new Record({
      userId:   req.userId,
      title,
      amount:   Math.abs(Number(amount)),
      category,
      type:     type || 'expense',
      date:     normalizeRecordDate(date),
    });
    await record.save();
    res.json(record);
  } catch {
    res.status(500).json({ error: 'Kayıt eklenemedi' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, userId: req.userId });
    if (!record) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    const { title, amount, category, type, date } = req.body;
    if (title    !== undefined) record.title    = title;
    if (amount   !== undefined) record.amount   = Math.abs(Number(amount));
    if (category !== undefined) record.category = category;
    if (type     !== undefined) record.type     = type;
    if (date     !== undefined) record.date     = normalizeRecordDate(date);
    await record.save();
    res.json(record);
  } catch {
    res.status(500).json({ error: 'Kayıt güncellenemedi' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, userId: req.userId });
    if (!record) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    await record.deleteOne();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Kayıt silinemedi' });
  }
});

module.exports = router;
