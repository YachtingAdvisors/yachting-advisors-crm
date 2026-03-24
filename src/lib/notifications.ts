import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { ADMIN_EMAILS } from '@/lib/types';

const DEFAULT_SMS_RECIPIENT = '+14106937337';

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
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
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
  lead: LeadNotificationPayload
) {
  // --- Email notifications ---
  try {
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
      const formResponsesHtml = lead.formResponses
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
      await transporter.sendMail({
        from: `Yachting Advisors CRM <${process.env.SMTP_USER}>`,
        to: Array.from(recipients).join(', '),
        subject: `New Lead: ${lead.name} — ${client.name}`,
        html,
      });
    }
  } catch (err) {
    console.error('[Email] Failed to send lead notification:', err);
  }

  // --- SMS notifications ---
  try {
    const twilioClient = getTwilioClient();
    if (!twilioClient) return;

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('client_id', client.id)
      .maybeSingle();

    const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+19549476277';
    const smsBody = `New Lead — ${client.name}\nName: ${lead.name}${lead.phone ? `\nPhone: ${lead.phone}` : ''}${lead.email ? `\nEmail: ${lead.email}` : ''}${lead.campaign ? `\nCampaign: ${lead.campaign}` : ''}`;

    const smsRecipients = new Set<string>([DEFAULT_SMS_RECIPIENT]);
    if (settings?.notification_phones) {
      for (const p of settings.notification_phones) {
        smsRecipients.add(p);
      }
    }

    for (const to of smsRecipients) {
      await twilioClient.messages.create({
        body: smsBody,
        from: fromNumber,
        to,
      });
    }
  } catch (err) {
    console.error('[SMS] Failed to send lead SMS:', err);
  }
}
