import mongoose from 'mongoose';

const RecurringRecordSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:     { type: String, required: true },
  amount:    { type: Number, required: true },
  category:  { type: String, required: true },
  type:      { type: String, enum: ['expense', 'investment', 'income'], default: 'expense' },
  currency:  { type: String, default: 'TRY' },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
  startDate: { type: Date, required: true },
  nextDate:  { type: Date, required: true },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('RecurringRecord', RecurringRecordSchema);
