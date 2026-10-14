const express = require('express');
const client = require('prom-client');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { pool } = require('./db');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

// Métricas: padrão do Node + histograma de latência por rota e status
client.collectDefaultMetrics();
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
});
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.baseUrl + req.route.path : 'unmatched';
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
});

app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

app.get('/readyz', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'db-unavailable' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/api/version', (req, res) => {
  res.json({ version: process.env.APP_VERSION || 'dev' });
});

app.get('/api/tasks', async (req, res) => {
  const [rows] = await pool.query('SELECT id, title, done, created_at FROM tasks ORDER BY id');
  res.json(rows);
});

app.post('/api/tasks', async (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title || title.length > 255) {
    return res.status(400).json({ error: 'title é obrigatório (1 a 255 caracteres)' });
  }
  const [result] = await pool.execute('INSERT INTO tasks (title) VALUES (?)', [title]);
  res.status(201).json({ id: result.insertId, title, done: false });
});

app.patch('/api/tasks/:id', async (req, res) => {
  const done = Boolean(req.body?.done);
  const [result] = await pool.execute('UPDATE tasks SET done = ? WHERE id = ?', [done, Number(req.params.id)]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'tarefa não encontrada' });
  res.json({ id: Number(req.params.id), done });
});

app.delete('/api/tasks/:id', async (req, res) => {
  const [result] = await pool.execute('DELETE FROM tasks WHERE id = ?', [Number(req.params.id)]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'tarefa não encontrada' });
  res.status(204).end();
});

// Express 5 encaminha erros de funções async para cá automaticamente
app.use((err, req, res, _next) => {
  req.log.error(err);
  res.status(500).json({ error: 'erro interno' });
});

module.exports = app;
