export interface Payment {
  id: string;
  date: string;
  benefit: string;
  program: string;
  status: 'pending' | 'complete';
  amount: number;
}

export interface BilingualText {
  en: string;
  fr: string;
}

export interface WhatsNewMessage {
  id: string;
  /** Which Unleash variant (dashboard-bff's dashboard-whats-new-message flag) produced this message. */
  variant: string;
  title: BilingualText;
  body: BilingualText;
}
