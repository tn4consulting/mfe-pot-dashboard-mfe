import { InMemorySessionCache, RedisSessionCache, SessionCache } from '@tn4consulting/shared-session-cache';
import { FeatureFlags, StaticFeatureFlags, UnleashFeatureFlags } from '@tn4consulting/shared-feature-flags-server';

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

/**
 * No UNLEASH_URL set (e.g. plain `nx serve`/tests) falls back to
 * StaticFeatureFlags, whose every flag/variant defaults off/null -- same
 * dev-default posture as sessionCache above. This is the first BFF-side
 * Unleash CLIENT-token consumer in the family (see
 * mfe-pot-platform/CLAUDE.md's "Design principles" section) -- the
 * server-side SDK existed but nothing instantiated it until now.
 */
export const featureFlags: FeatureFlags = process.env['UNLEASH_URL']
  ? new UnleashFeatureFlags({
      url: process.env['UNLEASH_URL'],
      appName: 'dashboard-bff',
      clientApiToken: process.env['UNLEASH_CLIENT_API_TOKEN'] ?? '',
    })
  : new StaticFeatureFlags();
