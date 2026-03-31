import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Use service role client to generate magic links server-side
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!email.toLowerCase().endsWith('@yachtingadvisors.com')) {
      return NextResponse.json({ error: 'Only @yachtingadvisors.com emails are allowed.' }, { status: 403 });
    }

    const supabase = getAdminClient();

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!userExists) {
      // Auto-create the user with a random password (they'll use magic link)
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true, // Skip email confirmation
      });

      if (createError) {
        console.error('Create user error:', createError);
        return NextResponse.json(
          { error: 'Could not create account. Contact your admin.' },
          { status: 500 }
        );
      }
    }

    // Generate a magic link using the admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${req.nextUrl.origin}/`,
      },
    });

    if (error || !data?.properties?.action_link) {
      console.error('Generate link error:', error);
      return NextResponse.json(
        { error: 'Could not generate sign-in link. Try again.' },
        { status: 500 }
      );
    }

    // Rewrite the base URL to production (Supabase generates links using its Site URL setting which may be localhost)
    const rawLink = data.properties.action_link;
    const prodOrigin = req.nextUrl.origin;
    const magicLink = rawLink.replace(/^https?:\/\/localhost:\d+/, prodOrigin);
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"Yachting Advisors" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Sign in to Yachting Advisors',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Yachting Advisors</h1>
          <p style="color: #33475b; font-size: 14px; margin-bottom: 32px;">Sign in to your CRM account</p>

          <a href="${magicLink}"
             style="display: inline-block; background: #ff7a59; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Sign In
          </a>

          <p style="color: #99acc2; font-size: 12px; margin-top: 32px; line-height: 1.5;">
            This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
          </p>

          <p style="color: #cbd6e2; font-size: 11px; margin-top: 24px;">
            Can't click the button? Copy and paste this URL:<br>
            <span style="color: #0091ae; word-break: break-all;">${magicLink}</span>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('Magic link error:', err);
    return NextResponse.json(
      { error: 'Failed to send sign-in link. Try again later.' },
      { status: 500 }
    );
  }
}
