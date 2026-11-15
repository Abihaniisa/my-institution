const express = require('express');
const app = express();
app.use(express.json());

// ═══════════════════════════════════════════════════════════
// CONFIGURATION — from environment variables only
// ═══════════════════════════════════════════════════════════
const VERITAS_API_KEY = process.env.VERITAS_API_KEY;
const FETCH_URL = process.env.FETCH_URL;
const VERITAS_URL = 'https://veritas-backend-production-aa12.up.railway.app';

if (!VERITAS_API_KEY) {
  console.error('FATAL: VERITAS_API_KEY env var is missing.');
  process.exit(1);
}
if (!FETCH_URL) {
  console.error('FATAL: FETCH_URL env var is missing.');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// YOUR DATA — hardcoded for the demo
// ═══════════════════════════════════════════════════════════
const MY_STUDENTS = [
  {
    nin: '12345678901',
    phone: '08012345678',
    name: 'Isa Yahya Bayero',
    certificates: [
      {
        title: 'WASSCE Certificate',
        fields: [
          { label: 'Exam Number', value: '4231001001' },
          { label: 'Exam Year', value: '2024' },
          { label: 'Mathematics', value: 'A1' },
        ],
        issued_at: '2024-06-15',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// SYNC LOGIC
// ═══════════════════════════════════════════════════════════
async function runSync() {
  const results = [];

  try {
    const res = await fetch(`${VERITAS_URL}/api/set-fetch-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: VERITAS_API_KEY, url: FETCH_URL }),
    });
    results.push({ step: 'set-fetch-url', ok: res.ok, data: await res.json() });
  } catch (err) {
    results.push({ step: 'set-fetch-url', ok: false, error: String(err) });
  }

  for (const student of MY_STUDENTS) {
    try {
      const res = await fetch(`${VERITAS_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: VERITAS_API_KEY,
          nin: student.nin,
          phone: student.phone,
        }),
      });
      results.push({ step: 'register', nin: student.nin, ok: res.ok, data: await res.json() });
    } catch (err) {
      results.push({ step: 'register', nin: student.nin, ok: false, error: String(err) });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════
app.post('/sync', async (req, res) => {
  try {
    const results = await runSync();
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/veritas/fetch', (req, res) => {
  const nin = req.query.nin;
  if (!nin) return res.json({ credentials: [] });

  const student = MY_STUDENTS.find((s) => s.nin === nin);
  if (!student) return res.json({ credentials: [] });

  res.json({
    credentials: student.certificates.map((c) => ({
      title: c.title,
      name: student.name,
      fields: c.fields,
      issued_at: c.issued_at,
    })),
  });
});

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Institution Sync</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
    button { padding: 0.75rem 1.5rem; font-size: 1rem; background: #123B26; color: white; border: none; border-radius: 0.5rem; cursor: pointer; width: 100%; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.8rem; }
  </style>
</head>
<body>
  <h1>Institution Sync</h1>
  <p>Click the button to sync your students with Veritas.</p>
  <button id="sync-btn" onclick="sync()">Sync Now</button>
  <pre id="output" style="margin-top: 1rem;"></pre>
  <script>
    async function sync() {
      const btn = document.getElementById('sync-btn');
      const out = document.getElementById('output');
      btn.disabled = true;
      btn.textContent = 'Syncing…';
      out.textContent = '';
      try {
        const res = await fetch('/sync', { method: 'POST' });
        const data = await res.json();
        out.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        out.textContent = 'Error: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sync Now';
      }
    }
  </script>
</body>
</html>`);
});

// ═══════════════════════════════════════════════════════════
// START — bind to 0.0.0.0 so Railway's proxy can reach it
// ═══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Institution server on port ${PORT}`));
