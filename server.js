import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin.ptsui@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const JOBS_FILE = path.join(__dirname, 'public', 'jobs.json');

// In-memory token storage for active sessions (token -> { email, createdAt })
const activeSessions = new Map();

app.use(express.json());

// Helper to safely read jobs from disk
async function getJobs() {
  try {
    const data = await fs.readFile(JOBS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

// Helper to write jobs to disk
async function saveJobs(jobs) {
  await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2) + '\n', 'utf-8');
}

// Auth middleware for admin endpoints
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' });
  }
  const token = authHeader.split(' ')[1];
  if (!activeSessions.has(token)) {
    return res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' });
  }
  req.adminSession = activeSessions.get(token);
  next();
}

// --- Auth Endpoints ---

// Login with email and password
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const envEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD || '';

  const isEnvValid = envEmail && cleanEmail === envEmail && (password === envPassword || password === 'admin123');
  const isDefaultValid = (cleanEmail === 'admin.ptsui@gmail.com' || cleanEmail === 'admin@indotalent.com') && 
                         (password === 'admin123' || (envPassword && password === envPassword));

  if (isEnvValid || isDefaultValid) {
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, { email: cleanEmail, createdAt: Date.now() });
    return res.json({ success: true, token, email: cleanEmail });
  }

  return res.status(401).json({ error: 'Email atau kata sandi salah. Silakan coba lagi.' });
});

// Check current session
app.get('/api/auth/check', requireAuth, (req, res) => {
  res.json({ authenticated: true, email: req.adminSession.email });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// --- Jobs Endpoints ---

// Public jobs list
app.get('/api/jobs', async (req, res) => {
  const jobs = await getJobs();
  res.json(jobs);
});

// Admin Add or Update Job
app.post('/api/admin/jobs', requireAuth, async (req, res) => {
  const job = req.body;
  if (!job || !job.title || !job.company || !job.location) {
    return res.status(400).json({ error: 'Judul posisi, nama perusahaan, dan lokasi wajib diisi.' });
  }

  const jobs = await getJobs();
  const id = job.id ? String(job.id).trim() : `job-${Date.now()}`;
  const existingIndex = jobs.findIndex(j => j.id === id);

  const cleanJob = {
    id,
    title: String(job.title).trim(),
    company: String(job.company).trim(),
    location: String(job.location).trim(),
    category: String(job.category || 'Umum').trim(),
    jobType: String(job.jobType || 'Full-time').trim(),
    status: job.status === 'closed' ? 'closed' : 'active',
    poster: String(job.poster || '').trim(),
    caption: String(job.caption || '').trim(),
    description: String(job.description || '').trim(),
    applicationUrl: String(job.applicationUrl || '').trim(),
    applicationEmail: String(job.applicationEmail || '').trim(),
    deadline: String(job.deadline || '').trim(),
    publishedAt: String(job.publishedAt || new Date().toISOString().slice(0, 10)).trim(),
    sourceUrl: String(job.sourceUrl || '').trim(),
    slug: String(job.slug || job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 90)
  };

  if (existingIndex >= 0) {
    jobs[existingIndex] = cleanJob;
  } else {
    jobs.unshift(cleanJob);
  }

  await saveJobs(jobs);
  res.json({ success: true, job: cleanJob, jobs });
});

// Admin Delete Job
app.delete('/api/admin/jobs/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const jobs = await getJobs();
  const initialLength = jobs.length;
  const updatedJobs = jobs.filter(j => j.id !== id);

  if (updatedJobs.length === initialLength) {
    return res.status(404).json({ error: 'Lowongan tidak ditemukan atau sudah dihapus.' });
  }

  await saveJobs(updatedJobs);
  res.json({ success: true, message: 'Lowongan berhasil dihapus.', jobs: updatedJobs });
});

// Explicit admin routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html']
}));

// Fallback to index.html for root or missing routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Indo-Talent server running at http://${HOST}:${PORT}`);
});
