export type Locale = 'en' | 'ar';

export type DispatchVars = {
  recipient_name: string;
  tenant_name: string;
  service_name: string;
  starts_at_iso: string;
  starts_at_display: string;
  duration_minutes: number;
  manage_link?: string;
  ics?: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType: string }[];
};

export type EmailDispatcher = {
  send(msg: EmailMessage): Promise<{ provider_id: string }>;
};

export type WhatsappMessage = {
  to: string;
  template: string;
  params: string[];
  locale: Locale;
};

export type WhatsappDispatcher = {
  send(msg: WhatsappMessage): Promise<{ provider_id: string }>;
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type PushDispatcher = {
  send(msg: PushMessage): Promise<{ provider_id: string }>;
};
