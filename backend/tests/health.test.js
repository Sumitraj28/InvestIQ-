const request = require('supertest');
const { app } = require('../server');

describe('Health Endpoints', () => {
  test('GET /api/health returns 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('InvestIQ Backend');
  });

  test('GET /api/ready returns 200 or 503', async () => {
    const response = await request(app).get('/api/ready');
    expect([200, 503]).toContain(response.status);
    expect(response.body.status).toBeDefined();
    expect(response.body.database).toBeDefined();
  });
});