import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import User from '../models/User';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.' },
  keyGenerator: (request) => {
    const raw = (request.body as { email?: string })?.email;
    if (raw != null && String(raw).trim() !== '') {
      return `auth:${String(raw).trim().toLowerCase()}`;
    }
    const addr = request.ip ?? request.socket?.remoteAddress ?? '0.0.0.0';
    return `ip:${ipKeyGenerator(addr)}`;
  },
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Ad, e-posta ve şifre zorunludur' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz' });
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
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' },
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[POST /auth/register]', err);
    res.status(500).json({ error: 'Kayıt oluşturulamadı' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gereklidir' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz' });
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
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' },
    );
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[POST /auth/login]', err);
    res.status(500).json({ error: 'Giriş yapılamadı' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    console.error('[GET /auth/me]', err);
    res.status(500).json({ error: 'Bilgi alınamadı' });
  }
});

export default router;
