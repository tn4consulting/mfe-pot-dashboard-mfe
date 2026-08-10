import request from 'supertest';
import { createApp } from './app';

const mockGetPayments = jest.fn();
const mockGetCorrespondence = jest.fn();
jest.mock('./data', () => ({
  getPayments: (sub: string) => mockGetPayments(sub),
  getCorrespondence: (sub: string) => mockGetCorrespondence(sub),
  // Real implementation, not a jest.fn() -- this endpoint's own tests below
  // want the actual control/updated-message lookup behavior, not a mock.
  getWhatsNewMessage: jest.requireActual('./data').getWhatsNewMessage,
}));

// The real JWKS-based JWT verification and the whoami response shape are
// both covered by shared-auth-server's own tests -- this only proves
// /api/whoami wires the middleware and handler together correctly.
jest.mock('@tn4consulting/shared-auth-server', () => ({
  verifyBearerToken:
    () =>
    (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        req.auth = { sub: 'citizen-abc123', name: 'Alex Chen', sin: '123-456-789', claims: [] };
        next();
        return;
      }
      res.status(401).json({ error: 'Invalid or expired token' });
    },
  whoamiHandler: (req: import('express').Request, res: import('express').Response) => {
    if (!req.auth) {
      res.status(401).json({ error: 'Missing verified identity' });
      return;
    }
    res.json({ sub: req.auth.sub, name: req.auth.name, sinMasked: 'MASKED' });
  },
}));

describe('dashboard-bff', () => {
  const app = createApp();

  afterEach(() => {
    mockGetPayments.mockReset();
    mockGetCorrespondence.mockReset();
  });

  it('reports healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('reports ready when its own sessionCache round-trip succeeds', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
  });

  it('requires a sub query parameter for payments', async () => {
    const res = await request(app).get('/api/payments');
    expect(res.status).toBe(400);
  });

  it('returns payments for a given sub', async () => {
    mockGetPayments.mockReturnValue([{ id: 'pay-1', date: '2026-07-15', benefit: 'EI', amount: 638 }]);
    const res = await request(app).get('/api/payments').query({ sub: 'mock-citizen-001' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'pay-1', date: '2026-07-15', benefit: 'EI', amount: 638 }]);
  });

  it('requires a sub query parameter for correspondence', async () => {
    const res = await request(app).get('/api/correspondence');
    expect(res.status).toBe(400);
  });

  it('returns correspondence for a given sub', async () => {
    mockGetCorrespondence.mockReturnValue([{ id: 'corr-1', date: '2026-07-10', subject: 'Your EI application has been approved' }]);
    const res = await request(app).get('/api/correspondence').query({ sub: 'mock-citizen-001' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'corr-1', date: '2026-07-10', subject: 'Your EI application has been approved' }]);
  });

  it('returns the control What\'s New variant when no Unleash flag is configured (StaticFeatureFlags default)', async () => {
    const res = await request(app).get('/api/whats-new').query({ sub: 'mock-citizen-001' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ variant: 'control', id: 'whats-new-esdc-test-message' });
  });

  it('returns the control What\'s New variant even without a sub query parameter', async () => {
    const res = await request(app).get('/api/whats-new');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ variant: 'control' });
  });

  it('accepts a sessionId query parameter too (what the Unleash flag is actually keyed on)', async () => {
    const res = await request(app).get('/api/whats-new').query({ sessionId: 'tab-abc-123' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ variant: 'control' });
  });

  it('returns the verified identity with a masked SIN for /api/whoami', async () => {
    const res = await request(app).get('/api/whoami').set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sub: 'citizen-abc123', name: 'Alex Chen', sinMasked: 'MASKED' });
  });

  it('rejects /api/whoami without a valid bearer token', async () => {
    const res = await request(app).get('/api/whoami');
    expect(res.status).toBe(401);
  });

  it('resets its own session-cache state', async () => {
    const res = await request(app).post('/api/reset');
    expect(res.status).toBe(204);
  });
});

describe('dashboard-bff error handling', () => {
  // A rejected sessionCache call (the real-world shape of "Redis is
  // unreachable") should degrade gracefully, not surface Express's bare
  // default 500 HTML page -- see app.ts's own last-resort error handler
  // comment and mfe-pot/TODO.md's "Design principles" section,
  // principle 5. Uses /api/reset specifically: it's the one route here
  // that calls sessionCache directly rather than through ./data, which
  // this file's own top-level jest.mock already replaces with canned,
  // never-rejecting stubs. jest.resetModules() + a fresh require is safe
  // here (no React involved, unlike a frontend spec) -- see
  // shared-observability's own spec file for the identical pattern.
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns a degraded 503 envelope, not a bare 500, when sessionCache rejects', async () => {
    jest.doMock('./config', () => ({
      sessionCache: {
        getJson: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        setJson: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        reset: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        buildKey: (...parts: string[]) => parts.join(':'),
      },
      mockIdp: { jwksUrl: 'http://localhost/jwks', issuer: 'http://localhost', audience: 'test' },
    }));

    const { createApp } = require('./app');
    const app = createApp();

    const res = await request(app).post('/api/reset');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Service temporarily unavailable', degraded: true });
  });
});
