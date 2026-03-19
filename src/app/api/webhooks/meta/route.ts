import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchLeadById, fetchAdInfo, parseLeadFields } from '@/lib/meta';
import nodemailer from 'nodemailer';
import { ADMIN_EMAILS } from '@/lib/types';

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

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST — Meta sends lead notifications here
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServiceClient();

  // Get all clients to match page IDs to access tokens
  const { data: clients } = await supabase.from('clients').select('*');
  const clientMap = new Map(
    (clients || []).map((c: any) => [c.meta_page_id, c])
  );

  const entries = body.entry || [];
  for (const entry of entries) {
    const pageId = String(entry.id);
    const client = clientMap.get(pageId);
    if (!client) continue;

    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'leadgen') continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      try {
        const leadData = await fetchLeadById(leadgenId, client.meta_access_token);
        const { name, email, phone, formResponses } = parseLeadFields(leadData.field_data || []);

        let campaign: string | null = null;
        let adName: string | null = null;
        if (leadData.ad_id) {
          const adInfo = await fetchAdInfo(leadData.ad_id, client.meta_access_token);
          if (adInfo) {
            adName = adInfo.name || null;
            campaign = adInfo.campaign?.name || null;
          }
        }

        await supabase.from('leads').upsert(
          {
            meta_lead_id: leadData.id,
            client_id: client.id,
            name,
            email,
            phone,
            source: 'Meta',
            campaign,
            ad_name: adName,
            form_responses: formResponses,
            status: 'New',
          },
          { onConflict: 'meta_lead_id' }
        );

        // Send email notification to users associated with this client
        await sendLeadNotification(supabase, client, { name, email, phone, campaign, adName, formResponses });
      } catch (err) {
        console.error(`[Webhook] Failed to process lead ${leadgenId}:`, err);
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function sendLeadNotification(
  supabase: any,
  client: any,
  lead: {
    name: string;
    email: string | null;
    phone: string | null;
    campaign: string | null;
    adName: string | null;
    formResponses: Array<{ question: string; answer: string }>;
  }
) {
  try {
    // Get all users assigned to this client + admins
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('user_email')
      .eq('client_id', client.id);

    const recipients = new Set<string>(ADMIN_EMAILS);
    for (const uc of userClients || []) {
      if (uc.user_email) recipients.add(uc.user_email);
    }

    if (recipients.size === 0) return;

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

        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yachting-advisors-crm.vercel.app'}" style="display:inline-block;margin-top:24px;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500">View in CRM</a>
      </div>
    `;

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `Yachting Advisors CRM <${process.env.SMTP_USER}>`,
      to: Array.from(recipients).join(', '),
      subject: `New Lead: ${lead.name} — ${client.name}`,
      html,
    });
  } catch (err) {
    console.error('[Email] Failed to send lead notification:', err);
  }
}
