const mongoose = require('mongoose');
const { normalizeRecordDate } = require('../utils/date');

const RecordSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  amount:   { type: Number, required: true },
  category: { type: String, required: true },
  type:     { type: String, enum: ['expense', 'investment'], default: 'expense' },
  date:     { type: Date, default: Date.now },
}, { timestamps: true });

RecordSchema.set('toJSON', {
  transform(doc, ret) {
    const raw = doc.get('date');
    const d = normalizeRecordDate(raw);
    ret.date = d.toISOString();
    return ret;
  },
});

module.exports = mongoose.model('Record', RecordSchema);
