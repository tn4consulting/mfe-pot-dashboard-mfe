import { Payment } from './models';

/**
 * dashboard-bff owns payment history as its own local data (see
 * CLAUDE.md's "Backends: BFF pattern" section). The payment-history widget
 * (embedded live in life-events, and shown on dashboard's own
 * overview) goes through dashboard-bff's /api/payments endpoint.
 */
export interface PaymentHistoryApiClient {
  getPayments(sub: string): Promise<Payment[]>;
}
