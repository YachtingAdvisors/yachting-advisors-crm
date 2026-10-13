import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { ADMIN_EMAILS } from '@/lib/types';
import { claimDelivery, parseRecipientConfig, recordDelivery, resolveSmsRecipients, type DeliveryChannel, type DeliveryResult, type DeliveryState } from '@/lib/notification-delivery';


export type NotificationChannel = DeliveryChannel;
export type NotificationDeliveryState = DeliveryState;
export type NotificationDeliveryResult = DeliveryResult;

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_YA_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (accountSid && authToken) return twilio(accountSid, authToken);

  const apiKeySid = process.env.TWILIO_YA_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_YA_API_KEY_SECRET;
  if (accountSid && apiKeySid && apiKeySecret) {
    return twilio(apiKeySid, apiKeySecret, { accountSid });
  }
  return null;
}

interface LeadNotificationPayload {
  name: string;
  email: string | null;
  phone: string | null;
  campaign: string | null;
  adName: string | null;
  formResponses: Array<{ question: string; answer: string }>;
}

export async function sendLeadNotification(
  supabase: any,
  client: any,
  lead: LeadNotificationPayload & { id?: string },
  options: { channels?: NotificationChannel[]; recipients?: string[] } = {}
): Promise<NotificationDeliveryResult[]> {
  const channels = options.channels || ['email', 'sms'];
  const results: NotificationDeliveryResult[] = [];

  async function claim(channel: NotificationChannel, recipient: string) {
    return lead.id ? claimDelivery(supabase, lead.id, channel, recipient) : true;
  }

  async function record(channel: NotificationChannel, recipient: string, result: Omit<NotificationDeliveryResult, 'channel' | 'recipient'>) {
    const fullResult = { channel, recipient, ...result } as NotificationDeliveryResult;
    results.push(fullResult);
    if (lead.id) await recordDelivery(supabase, lead.id, fullResult);
  }

  // --- Email notifications ---
  if (channels.includes('email')) try {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('user_email')
      .eq('client_id', client.id);

    const recipients = new Set<string>(ADMIN_EMAILS);
    for (const uc of userClients || []) {
      if (uc.user_email) recipients.add(uc.user_email);
    }

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('client_id', client.id)
      .maybeSingle();

    if (settings?.notification_emails) {
      for (const e of settings.notification_emails) {
        recipients.add(e);
      }
    }

    if (recipients.size > 0) {
      const EMAIL_SKIP_FIELDS = new Set(['full_name', 'name', 'first_name', 'last_name', 'email', 'phone', 'phone_number']);
      const formResponsesHtml = lead.formResponses
        .filter((fr) => !EMAIL_SKIP_FIELDS.has(fr.question.toLowerCase().replace(/\s+/g, '_')))
        .map((fr) => `<tr><td style="padding:6px 12px;color:#9ca3af;border-bottom:1px solid #1f2937">${fr.question}</td><td style="padding:6px 12px;color:#e5e7eb;border-bottom:1px solid #1f2937">${fr.answer}</td></tr>`)
        .join('');

      const html = `
        <div style="font-family:'DM Sans',system-ui,sans-serif;background:#0a0c10;color:#e5e7eb;padding:32px;border-radius:12px;max-width:560px">
          <h2 style="color:#fff;margin:0 0 4px">New Lead from ${client.name}</h2>
          <p style="color:#6b7280;margin:0 0 24px;font-size:14px">${lead.campaign || 'Meta Ads'}</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 12px;color:#9ca3af;border-bottom:1px solid #1f2937">Name</td><td style="padding:6px 12px;color:#fff;font-weight:600;border-bottom:1px solid #1f2937">${lead.name}</td></tr>
            ${lead.email ? `<tr><td style="padding:6px 12px;color:#9ca3af;border-bottom:1px solid #1f2937">Email</td><td style="padding:6px 12px;border-bottom:1px solid #1f2937"><a href="mailto:${lead.email}" style="color:#60a5fa">${lead.email}</a></td></tr>` : ''}
            ${lead.phone ? `<tr><td style="padding:6px 12px;color:#9ca3af;border-bottom:1px solid #1f2937">Phone</td><td style="padding:6px 12px;border-bottom:1px solid #1f2937"><a href="tel:${lead.phone}" style="color:#60a5fa">${lead.phone}</a></td></tr>` : ''}
            ${lead.adName ? `<tr><td style="padding:6px 12px;color:#9ca3af;border-bottom:1px solid #1f2937">Ad</td><td style="padding:6px 12px;color:#e5e7eb;border-bottom:1px solid #1f2937">${lead.adName}</td></tr>` : ''}
          </table>

          ${formResponsesHtml ? `
            <h3 style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:20px 0 8px">Form Responses</h3>
            <table style="width:100%;border-collapse:collapse">${formResponsesHtml}</table>
          ` : ''}

        </div>
      `;

      const transporter = getTransporter();
      for (const recipient of recipients) {
        if (!(await claim('email', recipient))) {
          await record('email', recipient, { state: 'skipped' });
          continue;
        }
        try {
          const info = await transporter.sendMail({
            from: `Yachting Advisors CRM <${process.env.SMTP_USER}>`,
            to: recipient,
            subject: `New Lead: ${lead.name} — ${client.name}`,
            html,
          });
          await record('email', recipient, {
            state: 'accepted',
            providerMessageId: info.messageId,
            providerStatus: 'smtp-accepted',
          });
        } catch (err) {
          await record('email', recipient, { state: 'failed', error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  } catch (err) {
    console.error('[Email] Failed to send lead notification:', err);
  }

  // --- SMS notifications ---
  if (channels.includes('sms')) try {
    const twilioClient = getTwilioClient();
    if (!twilioClient) return results;

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('client_id', client.id)
      .maybeSingle();

    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_YA_FROM_NUMBER;
    if (!fromNumber) {
      console.error('[SMS] TWILIO_PHONE_NUMBER is not configured');
      return results;
    }
    const SKIP_FIELDS = new Set(['full_name', 'name', 'first_name', 'last_name', 'email', 'phone', 'phone_number']);
    const formLines = lead.formResponses
      .filter((fr) => !SKIP_FIELDS.has(fr.question.toLowerCase().replace(/\s+/g, '_')))
      .map((fr) => `${fr.question}: ${fr.answer}`)
      .join('\n');
    const smsBody = `New Lead — ${client.name}\nName: ${lead.name}${lead.phone ? `\nPhone: ${lead.phone}` : ''}${lead.email ? `\nEmail: ${lead.email}` : ''}${lead.campaign ? `\nCampaign: ${lead.campaign}` : ''}${formLines ? `\n\n${formLines}` : ''}`;

    const fiveStarRecipients = parseRecipientConfig(process.env.FIVESTAR_SMS_RECIPIENTS, 3);
    const smsRecipients = resolveSmsRecipients(
      client.name,
      settings?.notification_phones || [],
      options.recipients,
      process.env.DEFAULT_SMS_RECIPIENT,
      fiveStarRecipients
    );

    for (const to of smsRecipients) {
      if (!(await claim('sms', to))) {
        await record('sms', to, { state: 'skipped' });
        continue;
      }
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
          || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
        const statusCallback = appUrl && process.env.TWILIO_AUTH_TOKEN
          ? `${appUrl}/api/webhooks/twilio/status`
          : undefined;
        const message = await twilioClient.messages.create({ body: smsBody, from: fromNumber, to, ...(statusCallback ? { statusCallback } : {}) });
        const providerState: NotificationDeliveryState = message.status === 'delivered'
          ? 'delivered'
          : ['failed', 'undelivered'].includes(message.status)
            ? 'failed'
            : 'accepted';
        await record('sms', to, {
          state: providerState,
          providerMessageId: message.sid,
          providerStatus: message.status,
        });
      } catch (err) {
        await record('sms', to, { state: 'unknown', error: err instanceof Error ? err.message : String(err) });
      }
    }
  } catch (err) {
    console.error('[SMS] Failed to send lead SMS:', err);
  }
  return results;
}
