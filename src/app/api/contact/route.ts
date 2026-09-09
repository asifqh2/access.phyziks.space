// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialise once — the key is read server-side only and never sent to the browser
const resend = new Resend(process.env.RESEND_API_KEY);

const RECIPIENT_EMAIL = 'phyziks.space@gmail.com';
const FROM_ADDRESS    = 'Phyziks Contact <onboarding@resend.dev>';

// Human-readable label for each subject value
const SUBJECT_LABELS: Record<string, string> = {
  billing : 'Billing & Payments',
  refund  : 'Refund / Cancellation',
  access  : 'Course Access Issue',
  support : 'Technical Support',
  content : 'Content Request',
  feedback: 'Feedback',
  other   : 'Other',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body as Record<string, unknown>;

    // ── Validation ────────────────────────────────────────────────────────────
    if (
      typeof name    !== 'string' || !name.trim()    ||
      typeof email   !== 'string' || !email.trim()   ||
      typeof subject !== 'string' || !subject.trim() ||
      typeof message !== 'string' || !message.trim()
    ) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      );
    }

    const allowedSubjects = Object.keys(SUBJECT_LABELS);
    if (!allowedSubjects.includes(subject)) {
      return NextResponse.json(
        { error: 'Please select a valid subject.' },
        { status: 400 },
      );
    }

    // Sanitise inputs — trim and cap lengths to prevent abuse
    const safeName    = name.trim().slice(0, 100);
    const safeEmail   = email.trim().toLowerCase().slice(0, 254);
    const safeMessage = message.trim().slice(0, 5000);
    const subjectLabel = SUBJECT_LABELS[subject];

    // ── Send email via Resend ─────────────────────────────────────────────────
    const { error: resendError } = await resend.emails.send({
      from   : FROM_ADDRESS,
      to     : RECIPIENT_EMAIL,
      replyTo: safeEmail,
      subject: `[Contact] ${subjectLabel} — ${safeName}`,
      text   : buildPlainText(safeName, safeEmail, subjectLabel, safeMessage),
      html   : buildHtml(safeName, safeEmail, subjectLabel, safeMessage),
    });

    if (resendError) {
      // Log full error server-side; never expose to client
      console.error('[contact/route] Resend delivery error:', resendError);
      return NextResponse.json(
        { error: 'delivery_failed' },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    // Unexpected error — log and return a generic 500
    console.error('[contact/route] Unexpected error:', err);
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 },
    );
  }
}

// ── Email body helpers ────────────────────────────────────────────────────────

function buildPlainText(
  name: string,
  email: string,
  subject: string,
  message: string,
): string {
  return [
    'You have received a new contact form submission from Phyziks.',
    '',
    `Name    : ${name}`,
    `Email   : ${email}`,
    `Subject : ${subject}`,
    '',
    'Message:',
    message,
    '',
    '─────────────────────────────────',
    'Sent via the Phyziks contact form at phyziks.space',
  ].join('\n');
}

function buildHtml(
  name: string,
  email: string,
  subject: string,
  message: string,
): string {
  // Escape user-supplied strings for safe HTML rendering
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Message</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4338ca,#4f46e5);padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">
                New Contact Message
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:#c7d2fe;">
                Submitted via phyziks.space contact form
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">From</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${esc(name)}</p>
                    <a href="mailto:${esc(email)}" style="font-size:13px;color:#4f46e5;text-decoration:none;">${esc(email)}</a>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Subject</p>
                    <p style="margin:0;font-size:15px;color:#0f172a;">${esc(subject)}</p>
                  </td>
                </tr>

                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Message</p>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;font-size:14px;line-height:1.7;color:#334155;">
                      ${esc(message)}
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Reply CTA -->
          <tr>
            <td style="padding:0 32px 32px;">
              <a href="mailto:${esc(email)}"
                style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 22px;border-radius:8px;">
                Reply to ${esc(name)}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                This message was sent from the contact form at
                <a href="https://phyziks.space/contact-us" style="color:#4f46e5;text-decoration:none;">phyziks.space</a>.
                Do not reply to this automated notification — use the button above instead.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
