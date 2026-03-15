require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ─── Models ───────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

const RecordSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  amount:   { type: Number, required: true },
  category: { type: String, required: true },
  type:     { type: String, enum: ['expense', 'investment'], default: 'expense' },
  date:     { type: String, default: () => new Date().toLocaleDateString('tr-TR') },
}, { timestamps: true });

const Record = mongoose.model('Record', RecordSchema);

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user   = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Ad, e-posta ve şifre zorunludur' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Bu e-posta adresi zaten kullanımda' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' },
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: 'Kayıt oluşturulamadı' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gereklidir' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' },
    );
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch {
    res.status(500).json({ error: 'Giriş yapılamadı' });
  }
});

app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch {
    res.status(500).json({ error: 'Bilgi alınamadı' });
  }
});

// ─── Record Routes (auth required) ───────────────────────────────────────────

app.get('/records', authMiddleware, async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.type) filter.type = req.query.type;
    const records = await Record.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch {
    res.status(500).json({ error: 'Kayıtlar getirilemedi' });
  }
});

app.post('/records', authMiddleware, async (req, res) => {
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
      date,
    });
    await record.save();
    res.json(record);
  } catch {
    res.status(500).json({ error: 'Kayıt eklenemedi' });
  }
});

app.put('/records/:id', authMiddleware, async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, userId: req.userId });
    if (!record) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    const { title, amount, category, type, date } = req.body;
    if (title    !== undefined) record.title    = title;
    if (amount   !== undefined) record.amount   = Math.abs(Number(amount));
    if (category !== undefined) record.category = category;
    if (type     !== undefined) record.type     = type;
    if (date     !== undefined) record.date     = date;
    await record.save();
    res.json(record);
  } catch {
    res.status(500).json({ error: 'Kayıt güncellenemedi' });
  }
});

app.delete('/records/:id', authMiddleware, async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, userId: req.userId });
    if (!record) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    await record.deleteOne();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Kayıt silinemedi' });
  }
});

app.listen(3001, () => console.log('Backend running on port 3001'));
