import { InMemorySessionCache, RedisSessionCache, SessionCache } from '@tn4consulting/shared-session-cache';

export const mockIdp = {
  jwksUrl: process.env['MOCK_IDP_JWKS_URL'] ?? 'http://localhost:3005/.well-known/jwks.json',
  issuer: process.env['MOCK_IDP_ISSUER'] ?? 'http://localhost:3005',
  audience: 'mfe-pot-bffs',
};

/**
 * No REDIS_URL set (e.g. plain `nx serve`) falls back to an in-process
 * cache -- zero extra local setup, matching every other BFF env var's
 * dev-default pattern above.
 */
export const sessionCache: SessionCache = process.env['REDIS_URL']
  ? new RedisSessionCache({ url: process.env['REDIS_URL'], keyPrefix: 'dashboard' })
  : new InMemorySessionCache('dashboard');
