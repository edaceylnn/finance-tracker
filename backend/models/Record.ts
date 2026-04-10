import mongoose, { type Document } from 'mongoose';
import { normalizeRecordDate } from '../utils/date';

const RecordSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  amount:   { type: Number, required: true },
  category: { type: String, required: true },
  type:     { type: String, enum: ['expense', 'investment', 'income'], default: 'expense' },
  currency: { type: String, default: 'TRY' },
  date:     { type: Date, default: Date.now },
}, { timestamps: true });

RecordSchema.set('toJSON', {
  transform(doc: Document, ret: Record<string, unknown>) {
    const raw = doc.get('date');
    const d = normalizeRecordDate(raw);
    ret.date = d.toISOString();
    return ret;
  },
});

export default mongoose.model('Record', RecordSchema);
