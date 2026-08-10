import { WhatsNewMessage } from './models';

export interface WhatsNewFlagContext {
  /** The signed-in citizen's sub claim -- forwarded for future multi-persona targeting. */
  sub?: string;
  /**
   * A random per-browser-tab id (see dashboard-mfe's WhatsNewList.tsx) --
   * what dashboard-bff's Unleash flag is actually keyed on, since this
   * PoT's one seeded mock persona would otherwise always resolve to the
   * same variant.
   */
  sessionId?: string;
}

/**
 * dashboard-bff resolves the message itself, A/B-testing its content via
 * an Unleash variant flag (see CLAUDE.md's "Design principles" section) --
 * every field here is only for that flag's rollout stickiness, not data
 * ownership, so all are optional.
 */
export interface WhatsNewApiClient {
  getWhatsNewMessage(context?: WhatsNewFlagContext): Promise<WhatsNewMessage>;
}
