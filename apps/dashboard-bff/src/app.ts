import cors from 'cors';
import express, { Express } from 'express';
import { verifyBearerToken, whoamiHandler } from '@tn4consulting/shared-auth-server';
import { mockIdp, sessionCache } from './config';
import { getCorrespondence, getPayments } from './data';

/**
 * MSCA-D's own BFF: serves its own local payments/correspondence data
 * (`data.ts`) -- the same in-memory-stub pattern job-bank-bff/employment-
 * insurance-bff use for their own domains. Cross-domain content (job
 * applications, EI reporting status) is composed in the browser instead,
 * via the widget-loader mechanism (see mfe-pot-msca-shell's routes.tsx and
 * dashboard-mfe's Overview.tsx) -- this BFF never calls another BFF, per
 * mfe-pot/TODO.md's "Design principles" section. It used to (a
 * `getBenefitOverview` fan-out to job-bank-bff/employment-insurance-bff,
 * `/api/overview`) before that principle was agreed; deleted rather than
 * kept as a documented exception once it turned out to have zero real
 * consumers left (dashboard-mfe's Overview page stopped rendering the
 * content it fed back when the page was redesigned to match
 * docs/msca-screenshots/dashboard.png).
 */
export function createApp(): Express {
  const app = express();
  app.use(cors());

  // Bare liveness check -- "the process is up," nothing more. See
  // mfe-pot-employment-insurance-mfe's app.ts for the fuller rationale on
  // why this stays separate from /ready below (same pattern, mirrored
  // here for consistency across all 3 BFFs).
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Real readiness check: a round-trip through this pod's own sessionCache
  // (Redis when REDIS_URL is set, always-succeeds in-memory otherwise --
  // see config.ts). See mfe-pot/TODO.md's "Design principles" section,
  // principle 3/4.
  app.get('/ready', async (_req, res) => {
    try {
      await sessionCache.getJson(sessionCache.buildKey('readiness-probe'));
      res.json({ status: 'ready' });
    } catch (err) {
      res.status(503).json({ status: 'not-ready', error: (err as Error).message });
    }
  });

  app.get('/api/payments', async (req, res) => {
    const sub = req.query['sub'];
    if (typeof sub !== 'string') {
      res.status(400).json({ error: 'sub query parameter is required' });
      return;
    }
    res.json(await getPayments(sub));
  });

  app.get('/api/correspondence', async (req, res) => {
    const sub = req.query['sub'];
    if (typeof sub !== 'string') {
      res.status(400).json({ error: 'sub query parameter is required' });
      return;
    }
    res.json(await getCorrespondence(sub));
  });

  // Proves identity (including the SIN custom claim) actually propagated
  // from mock-idp through the browser and was independently verified here
  // -- see mfe-pot's plan doc. Deliberately mounted only on this one route,
  // not globally via app.use(): the existing domain routes above are
  // single-persona stub data that isn't keyed by sub yet (a bigger,
  // separate scope item), and CI's own smoke check calls /api/overview with
  // no sub param expecting a 400, which a blanket auth middleware would
  // turn into an unrelated 401.
  app.get(
    '/api/whoami',
    verifyBearerToken({ jwksUrl: mockIdp.jwksUrl, issuer: mockIdp.issuer, audience: mockIdp.audience }),
    whoamiHandler,
  );

  // PoT-only, no auth -- unlocks a repeatable `pnpm demo:reset` (see
  // mfe-pot/TODO.md) by clearing this BFF's own Redis-backed state between
  // local/CI runs and live demos.
  app.post('/api/reset', async (_req, res) => {
    await sessionCache.reset();
    res.status(204).send();
  });

  // Last-resort error handler, not per-call-site try/catch: Express 5
  // (this app's version) auto-forwards a rejected async route handler's
  // promise here, including every sessionCache.getJson/setJson call above
  // -- so a Redis outage (the realistic failure mode, given InMemory-
  // SessionCache never rejects) surfaces as this typed, degraded JSON
  // envelope instead of Express's bare default 500 HTML page. See
  // mfe-pot/TODO.md's "Design principles" section, principle 5.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('dashboard-bff: unhandled request error:', err);
    res.status(503).json({ error: 'Service temporarily unavailable', degraded: true });
  });

  return app;
}
