import { test, expect } from '@playwright/test';

test.describe('Backend API', () => {
  const API_URL = 'http://localhost:4000';

  test('should respond to health check', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBeLessThan(400);
  });

  test('should handle missing auth gracefully', async ({ request }) => {
    const response = await request.get(`${API_URL}/hotels`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test('should reject invalid JSON', async ({ request }) => {
    const response = await request.post(`${API_URL}/installer/setup`, {
      headers: { 'Content-Type': 'application/json' },
      data: 'invalid json',
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should validate request bodies', async ({ request }) => {
    const response = await request.post(`${API_URL}/installer/setup`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        hotelName: 123, // should be string
        currency: 'EUR',
      },
    });
    expect(response.status()).toBe(400);
  });
});
