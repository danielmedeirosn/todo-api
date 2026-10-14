const request = require('supertest');
const app = require('../src/app');
const { pool, migrate } = require('../src/db');

beforeAll(async () => {
  await migrate();
  await pool.query('DELETE FROM tasks');
});

afterAll(async () => {
  await pool.end();
});

describe('API de tarefas', () => {
  test('GET /healthz responde ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  test('POST /api/tasks cria uma tarefa', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Estudar CI/CD' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Estudar CI/CD');
  });

  test('POST /api/tasks sem título retorna 400', async () => {
    const res = await request(app).post('/api/tasks').send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/tasks lista as tarefas', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('GET /readyz confirma o banco', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
  });

  test('GET /metrics expõe o histograma', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('http_request_duration_seconds');
  });
});
