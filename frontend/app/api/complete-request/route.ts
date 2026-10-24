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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pcb-component-hub.vercel.app';

    let emailSent = false;
    let warning: string | undefined = undefined;

    // 5. Send Email via Resend if email is present
    if (targetEmail) {
      const resendApiKey = process.env.RESEND_API_KEY;

      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const fromEmail = process.env.EMAIL_FROM || 'PCB Component Hub <onboarding@resend.dev>';

          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your PCB Component is Ready!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">
        ⚡ PCB Component Hub
      </h1>
    </div>
    <div style="padding: 36px 32px;">
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">
        Good news! Your component is ready 🎉
      </h2>
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
        Hello! Your requested PCB component (<strong>${targetCompName}</strong>) has been successfully uploaded to <strong>PCB Component Hub</strong>. You can now download it from our platform.
      </p>
      
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 28px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Verified Part</p>
        <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #0f172a;">${targetCompName}</p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Schematic Symbol and PCB Footprint have been deployed to our library.</p>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${siteUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
          Go to PCB Component Hub →
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 24px 0;" />
      
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0; text-align: center;">
        Need another footprint or custom component? Visit our platform anytime to submit a new request.<br/>
        &copy; ${new Date().getFullYear()} PCB Component Hub. Built for Electronic Engineers.
      </p>
    </div>
  </div>
</body>
</html>
          `;

          const emailText = `Hello! Your requested PCB component (${targetCompName}) has been successfully uploaded to PCB Component Hub. You can now download it from our platform: ${siteUrl}`;

          const { error: resendError } = await resend.emails.send({
            from: fromEmail,
            to: [targetEmail],
            subject: `Your requested PCB component is ready: ${targetCompName}`,
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
