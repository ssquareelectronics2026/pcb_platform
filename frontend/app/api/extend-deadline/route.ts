import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      requestId,
      clientEmail,
      clientName = 'Valued Client',
      projectName,
      proposedDate,
      reason,
      customMessage,
    } = body;

    if (!clientEmail || !projectName || !proposedDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: clientEmail, projectName, and proposedDate are required.' },
        { status: 400 }
      );
    }

    const designerEmail = 'ssquareelectronics2026@gmail.com';

    // 1. Update Supabase record if requestId is provided
    if (requestId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        await supabase
          .from('component_requests')
          .update({
            status: 'Extension Requested',
          })
          .eq('id', requestId);
      } catch (dbErr) {
        console.warn('Failed to update request status in Supabase:', dbErr);
      }
    }

    // 2. Dispatch Live or Simulated Email to Client via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'S SQUARE ELECTRONICS <onboarding@resend.dev>';
    let emailSent = false;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Timeline Adjustment Proposal</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 28px; text-align: center; color: #ffffff;">
      <h2 style="margin: 0; font-size: 22px; font-weight: 800;">S SQUARE ELECTRONICS</h2>
      <p style="margin: 6px 0 0; opacity: 0.8; font-size: 14px;">PCB Design &amp; Engineering Department</p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 15px; margin-top: 0;">Dear <strong>${clientName}</strong>,</p>
      
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        The engineering team at <strong>S SQUARE ELECTRONICS</strong> is actively reviewing and laying out your hardware design for <strong>${projectName}</strong>.
      </p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Proposed Completion Date:</p>
        <p style="margin: 0; font-size: 20px; font-weight: 900; color: #15803d;">📅 ${proposedDate}</p>
        ${reason ? `<p style="margin: 10px 0 0; font-size: 13px; color: #166534;"><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        ${customMessage || `To ensure your board achieves maximum signal integrity, optimal component spacing, thermal reliability, and strict Design-for-Manufacturing (DFM) verification, our engineering team recommends the adjusted timeline above.`}
      </p>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Please reply directly to this email or reach out to us at <a href="mailto:${designerEmail}?subject=Re:%20Timeline%20Adjustment%20for%20${encodeURIComponent(projectName)}" style="color: #2563eb; font-weight: 600;">${designerEmail}</a> to confirm whether this proposed timeline suits your schedule.
      </p>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #0f172a;">
        <p style="margin: 0; font-weight: 700;">Best regards,</p>
        <p style="margin: 4px 0 0; color: #2563eb; font-weight: 800;">S SQUARE ELECTRONICS Team</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">Hardware &amp; PCB Design Department | S SQUARE ELECTRONICS</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">Email: <a href="mailto:${designerEmail}" style="color: #64748b;">${designerEmail}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: fromEmail,
          to: [clientEmail],
          replyTo: designerEmail,
          subject: `Timeline Adjustment Proposal: ${projectName} - S SQUARE ELECTRONICS`,
          html: emailHtml,
        });
        emailSent = true;
      } catch (err) {
        console.warn('Resend email error in extend-deadline:', err);
      }
    } else {
      console.log(`[SIMULATED EXTENSION EMAIL] To ${clientEmail} for project "${projectName}" proposed date: ${proposedDate}`);
      emailSent = true;
    }

    return NextResponse.json({
      success: true,
      emailSent,
      simulated: !resendApiKey,
      clientEmail,
      proposedDate,
      message: `Timeline update email successfully dispatched to ${clientEmail} from S SQUARE ELECTRONICS.`,
    });
  } catch (err: unknown) {
    console.error('extend-deadline error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
