import { getAccessToken } from '@tn4consulting/shared-auth/core';
import { WhatsNewApiClient, WhatsNewFlagContext } from './whats-new-api-client';
import { WhatsNewMessage } from './models';

/**
 * Calls this app's own BFF (dashboard-bff)'s /api/whats-new -- see
 * whats-new-api-client.ts for why every context field is optional.
 */
export class HttpWhatsNewApiClient implements WhatsNewApiClient {
  constructor(private readonly baseUrl: string) {}

  async getWhatsNewMessage(context?: WhatsNewFlagContext): Promise<WhatsNewMessage> {
    const url = new URL(`${this.baseUrl}/api/whats-new`);
    if (context?.sub) {
      url.searchParams.set('sub', context.sub);
    }
    if (context?.sessionId) {
      url.searchParams.set('sessionId', context.sessionId);
    }
    // Attaches the mock-idp-issued bearer token (if signed in) so
    // dashboard-bff can independently verify it -- see mfe-pot's plan doc.
    const token = getAccessToken();
    const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!response.ok) {
      throw new Error(`dashboard-bff returned ${response.status} for /api/whats-new`);
    }
    return (await response.json()) as WhatsNewMessage;
  }
}
