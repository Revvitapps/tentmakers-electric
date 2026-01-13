import type { BookRequest, BookingPipelineResult } from './sfTypes';

type SendGridConfig = {
  apiKey: string;
  from: string;
  to: string[];
};

export function getSendGridConfig(): SendGridConfig | null {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_TO;

  if (!apiKey || !from || !to) {
    return null;
  }

  return {
    apiKey,
    from,
    to: to
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  };
}

function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

function dedupeEmails(emails: string[]): string[] {
  const normalized = new Map<string, string>();
  emails.forEach((email) => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!normalized.has(key)) {
      normalized.set(key, trimmed);
    }
  });
  return Array.from(normalized.values());
}

function getServiceLabel(serviceType: string) {
  const mapping: Record<string, string> = {
    'led-recessed-lighting': 'LED Recessed Lighting',
    'ev-charger-install': 'EV Charger Install'
  };
  return mapping[serviceType] ?? serviceType;
}

function buildTextBody(payload: BookRequest, sf: BookingPipelineResult) {
  const serviceLabel = getServiceLabel(payload.service.type);
  const options = (payload.service.options ?? {}) as Record<string, unknown>;
  const estimateStatus =
    typeof options.estimateStatus === 'string' ? options.estimateStatus : 'Estimate Requested';
  const paymentPreference =
    typeof options.paymentPreference === 'string' ? options.paymentPreference : 'N/A';
  const depositPaid = options.depositPaid ? 'Yes' : 'No';
  const depositAmount =
    typeof options.depositAmount === 'number' ? `$${options.depositAmount}` : 'N/A';
  const lines = [
    `New ${serviceLabel} request`,
    '',
    `Name: ${payload.customer.firstName} ${payload.customer.lastName}`.trim(),
    `Email: ${payload.customer.email ?? 'N/A'}`,
    `Phone: ${payload.customer.phone ?? 'N/A'}`,
    '',
    `Estimate: ${payload.service.estimatedPrice ? `$${payload.service.estimatedPrice}` : 'N/A'}`,
    `Estimate status: ${estimateStatus}`,
    `Payment preference: ${paymentPreference}`,
    `Deposit paid: ${depositPaid}`,
    `Deposit amount: ${depositAmount}`,
    `Schedule start: ${payload.schedule.start}`,
    `Schedule end: ${payload.schedule.end}`,
    '',
    'Details:',
    payload.service.notes || 'N/A',
    '',
    'Service Fusion IDs:',
    `Customer: ${sf.customerId ?? 'unknown'}`,
    `Estimate: ${sf.estimateId ?? 'unknown'}`,
    `Calendar task: ${sf.calendarTaskId ?? 'unknown'}`
  ];

  return lines.join('\n');
}

export async function sendBookingEmail(
  payload: BookRequest,
  sfResult: BookingPipelineResult
): Promise<'sent' | 'skipped'> {
  const config = getSendGridConfig();
  if (!config || config.to.length === 0) {
    console.warn('Email skipped: SENDGRID_API_KEY/EMAIL_FROM/EMAIL_TO not fully set.');
    return 'skipped';
  }

  const serviceLabel = getServiceLabel(payload.service.type);
  const subject = `New ${serviceLabel} Request - ${payload.customer.firstName} ${payload.customer.lastName}`;
  const text = buildTextBody(payload, sfResult);

  const recipientEmails = dedupeEmails([
    ...config.to,
    ...(isValidEmail(payload.customer.email) ? [payload.customer.email.trim()] : [])
  ]);

  const personalizations = [
    {
      to: recipientEmails.map((email) => ({ email }))
    }
  ];

  const body = {
    personalizations,
    from: { email: config.from },
    subject,
    content: [{ type: 'text/plain', value: text }]
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`SendGrid API failed (${res.status}): ${errText}`);
  }

  return 'sent';
}

export async function sendCustomerReminderEmail(
  payload: BookRequest,
  stage: string
): Promise<'sent' | 'skipped'> {
  const config = getSendGridConfig();
  const email = payload.customer.email?.trim();
  if (!config || !email || !isValidEmail(email)) {
    console.warn('Reminder email skipped: missing configuration or customer email');
    return 'skipped';
  }

  const serviceLabel = getServiceLabel(payload.service.type);
  const subject =
    stage.includes('Deposit')
      ? `Reminder: Finish your ${serviceLabel} deposit`
      : `Reminder: Complete your ${serviceLabel} estimate request`;

  const lines = [
    `Hi ${payload.customer.firstName ?? 'there'},`,
    '',
    `We noticed you started the ${serviceLabel} estimate and reached the "${stage}" step.`,
    'To lock in your install slot, please return to the calculator and submit the $100 deposit or reply to this email so we can follow up.',
    '',
    'If you prefer, you can also call us at (704) 555-1234 or reply here and we’ll help you finish the booking.',
    '',
    '– Tentmakers Electric'
  ];

  const body = {
    personalizations: [
      {
        to: [{ email }]
      }
    ],
    from: { email: config.from },
    subject,
    content: [{ type: 'text/plain', value: lines.join('\n') }]
  };

  const res = await fetch('https://api/sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`SendGrid (reminder) failed (${res.status}): ${errText}`);
  }

  return 'sent';
}
