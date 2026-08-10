import { clearSession, storeSession } from '@tn4consulting/shared-auth/core';
import { HttpWhatsNewApiClient } from './http-whats-new-api-client';

describe('HttpWhatsNewApiClient', () => {
  const originalFetch = global.fetch;
  const client = new HttpWhatsNewApiClient('http://localhost:3004');

  afterEach(() => {
    global.fetch = originalFetch;
    clearSession();
  });

  it('fetches the message for a given sub with no Authorization header when signed out', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'whats-new-esdc-test-message', variant: 'control', title: { en: '', fr: '' }, body: { en: '', fr: '' } }),
    }) as unknown as typeof fetch;

    const message = await client.getWhatsNewMessage({ sub: 'mock-citizen-001' });
    expect(message.variant).toBe('control');
    expect(global.fetch).toHaveBeenCalledWith(
      new URL('http://localhost:3004/api/whats-new?sub=mock-citizen-001'),
      { headers: undefined },
    );
  });

  it('fetches with both sub and sessionId when both are given', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'whats-new-esdc-test-message', variant: 'control', title: { en: '', fr: '' }, body: { en: '', fr: '' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await client.getWhatsNewMessage({ sub: 'mock-citizen-001', sessionId: 'tab-abc-123' });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:3004/api/whats-new?sub=mock-citizen-001&sessionId=tab-abc-123'),
      { headers: undefined },
    );
  });

  it('fetches without any query parameters when no context is given', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'whats-new-esdc-test-message', variant: 'control', title: { en: '', fr: '' }, body: { en: '', fr: '' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await client.getWhatsNewMessage();

    expect(fetchMock).toHaveBeenCalledWith(new URL('http://localhost:3004/api/whats-new'), { headers: undefined });
  });

  it('attaches the mock-idp access token as a Bearer header when signed in', async () => {
    storeSession({
      sub: 'citizen-abc123',
      name: 'Alex Chen',
      claims: [],
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      accessToken: 'real-looking.jwt.value',
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'whats-new-esdc-test-message', variant: 'control', title: { en: '', fr: '' }, body: { en: '', fr: '' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await client.getWhatsNewMessage({ sub: 'citizen-abc123' });

    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer real-looking.jwt.value' } });
  });

  it('throws when dashboard-bff fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(client.getWhatsNewMessage({ sub: 'mock-citizen-001' })).rejects.toThrow('500');
  });
});
