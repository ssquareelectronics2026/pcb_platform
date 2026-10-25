import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId, adminSecret, componentName, userEmail } = body;

    // 1. Verify Admin Secret
    const validSecret = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
    if (adminSecret !== validSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid admin secret key.' }, { status: 401 });
    }

    if (!requestId) {
      return NextResponse.json({ error: 'Missing required field: requestId.' }, { status: 400 });
    }

    // 2. Initialize Supabase Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Update Request Status in Supabase
    const { data: updatedRequest, error: dbError } = await supabase
      .from('component_requests')
      .update({
        status: 'Completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (dbError) {
      console.error('Database update error:', dbError);
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    // 4. Determine Email Recipient and Component Name
    const targetEmail = userEmail || updatedRequest?.user_email;
    const targetCompName = componentName || updatedRequest?.component_name || 'PCB Component';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pcb-platform.vercel.app';

    let emailSent = false;
    let warning: string | undefined = undefined;

    // 5. Send Email via Resend if email is present
    if (targetEmail) {
      const resendApiKey = process.env.RESEND_API_KEY;

      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const fromEmail = process.env.EMAIL_FROM || 'S SQUARE ELECTRONICS <onboarding@resend.dev>';

          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your requested PCB component is now available on PCB Component Hub!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
        ⚡ PCB Component Hub
      </h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 36px;">
      <p style="font-size: 16px; color: #1e293b; margin-top: 0; margin-bottom: 20px; font-weight: 600;">
        Dear User,
      </p>

      <p style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
        We are pleased to inform you that your requested PCB component (<strong>${targetCompName}</strong>) has been successfully created, verified, and uploaded to <strong>PCB Component Hub</strong>.
      </p>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 22px 24px; margin-bottom: 30px; border-left: 4px solid #2563eb; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">
          Component Information
        </p>
        <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #0f172a;">
          ${targetCompName}
        </p>
        <p style="margin: 6px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.5;">
          The schematic symbol and PCB footprint files are now ready for immediate download and integration into your CAD projects.
        </p>
      </div>

      <!-- Call to Action Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://pcb-platform.vercel.app" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);">
          Download Component &rarr;
        </a>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #64748b; text-align: center; margin-bottom: 28px;">
        Or access directly via: <a href="https://pcb-platform.vercel.app" style="color: #2563eb; text-decoration: underline;">https://pcb-platform.vercel.app</a>
      </p>

      <!-- Formal Contact Box -->
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 18px 22px; margin-bottom: 30px; border: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
          If you have any questions or require revisions regarding your component request, you can directly reply to this email or reach us at <a href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Component%20Request" style="color: #2563eb; text-decoration: underline; font-weight: 600;">ssquareelectronics2026@gmail.com</a>.
        </p>
      </div>

      <!-- Formal Sign-Off -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
        <p style="font-size: 14px; color: #334155; margin: 0 0 4px 0; line-height: 1.6;">
          Sincerely,
        </p>
        <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0;">
          The S SQUARE ELECTRONICS Team
        </p>
        <p style="font-size: 13px; color: #94a3b8; margin: 6px 0 0 0;">
          Empowering electronic engineers with verified footprints and symbols.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
        &copy; ${new Date().getFullYear()} S SQUARE ELECTRONICS. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
          `;

          const emailText = `Dear User,\n\nWe are pleased to inform you that your requested PCB component (${targetCompName}) has been successfully created, verified, and uploaded to S SQUARE ELECTRONICS PCB Component Hub.\n\nYou can access and download it directly from our platform:\nhttps://pcb-platform.vercel.app\n\nIf you have any questions or require revisions regarding your component request, you can directly reply to this email or reach us at ssquareelectronics2026@gmail.com (mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Component%20Request).\n\nSincerely,\nThe S SQUARE ELECTRONICS Team`;

          const { error: resendError } = await resend.emails.send({
            from: fromEmail,
            to: [targetEmail],
            replyTo: 'ssquareelectronics2026@gmail.com',
            subject: 'Your requested PCB component is now available on PCB Component Hub!',
            html: emailHtml,
            text: emailText,
          });

          if (resendError) {
            console.error('Resend error:', resendError);
            warning = `Database updated, but email dispatch failed: ${resendError.message}`;
          } else {
            emailSent = true;
          }
        } catch (resendErr: unknown) {
          console.error('Resend unexpected exception:', resendErr);
          warning = `Database updated, but email failed: ${resendErr instanceof Error ? resendErr.message : 'Unknown email error'}`;
        }
      } else {
        warning = 'RESEND_API_KEY is not configured in environment variables. Request marked Completed without sending live email.';
      }
    } else {
      warning = 'No user email was associated with this request.';
    }

    return NextResponse.json({
      success: true,
      message: 'Request marked as Completed.',
      emailSent,
      warning,
      request: updatedRequest,
    });
  } catch (err: unknown) {
    console.error('complete-request API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
