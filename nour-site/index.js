const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data storage
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e) {}
  return { dispatches: [], definitions: [] };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GROQ AI translate
app.post('/api/translate', async (req, res) => {
  const { feeling } = req.body;
  if (!feeling) return res.status(400).json({ error: 'No feeling provided' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: `You are Nour Zidani — a Moroccan abstract painter based in Germany. Someone has described a feeling to you. You respond by telling them what you see in it, what it will become as paint. Your voice is sparse and declarative. No filler. Short sentences. You name colors, weight, movement — but never literally. You do not explain. You do not comfort. You translate. Maximum 5 lines. Never use the word "feeling". Never say "I understand". Never be warm in a customer-service way — be warm the way paint is warm. Never start with "I".`
          },
          { role: 'user', content: feeling }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';
    res.json({ reply });
  } catch(e) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

// File a dispatch
app.post('/api/dispatch', (req, res) => {
  const { name, country, moment } = req.body;
  if (!moment) return res.status(400).json({ error: 'No moment provided' });
  const data = loadData();
  data.dispatches.unshift({ name: name || 'Anonymous', country: country || 'Unknown', moment, date: new Date().toISOString() });
  saveData(data);
  res.json({ ok: true });
});

// Get dispatches
app.get('/api/dispatch', (req, res) => {
  const data = loadData();
  res.json(data.dispatches);
});

// Add consciousness definition
app.post('/api/consciousness', (req, res) => {
  const { definition } = req.body;
  if (!definition) return res.status(400).json({ error: 'No definition provided' });
  const data = loadData();
  data.definitions.unshift({ definition, date: new Date().toISOString() });
  saveData(data);
  res.json({ ok: true });
});

// Get definitions
app.get('/api/consciousness', (req, res) => {
  const data = loadData();
  res.json(data.definitions);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
