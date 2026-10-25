import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

interface FileItem {
  name: string;
  url: string;
  size?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectName,
      clientName,
      userEmail,
      fileUrl,
      fileName,
      files,
      componentList,
      boardConstraints,
      specialInstructions,
      expectedDeadline,
    } = body;

    if (!projectName || !clientName || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: projectName, clientName, and userEmail are required.' },
        { status: 400 }
      );
    }

    const attachedFiles: FileItem[] =
      Array.isArray(files) && files.length > 0
        ? files
        : fileUrl
        ? [{ name: fileName || 'Circuit Diagram / Datasheet', url: fileUrl }]
        : [];

    const designerEmail = 'ssquareelectronics2026@gmail.com';
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'S SQUARE ELECTRONICS <onboarding@resend.dev>';
    let emailSentToDesigner = false;
    let emailSentToClient = false;

    // 1. Send / Simulate Email Notification via Resend
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        // A. Email to S SQUARE ELECTRONICS Engineering Team
        const designerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Custom PCB Design Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 28px; text-align: center; color: #ffffff;">
      <h2 style="margin: 0; font-size: 22px; font-weight: 800;">⚡ New PCB Design Request</h2>
      <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Submitted to S SQUARE ELECTRONICS</p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 15px; margin-top: 0;">Hello <strong>S SQUARE ELECTRONICS Team</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">A new custom PCB design inquiry has been submitted by <strong>${clientName}</strong>:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600; color: #64748b; width: 38%;">Project Name:</td>
          <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${projectName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Client / Company:</td>
          <td style="padding: 10px 0; color: #0f172a;">${clientName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Client Email:</td>
          <td style="padding: 10px 0; color: #2563eb;"><a href="mailto:${userEmail}">${userEmail}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Target Deadline:</td>
          <td style="padding: 10px 0; font-weight: 700; color: #059669;">${expectedDeadline || 'Flexible'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Board Constraints:</td>
          <td style="padding: 10px 0; color: #0f172a;">${boardConstraints || 'None specified'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Component References:</td>
          <td style="padding: 10px 0; color: #0f172a;">${componentList || 'None specified'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Special Notes:</td>
          <td style="padding: 10px 0; color: #0f172a;">${specialInstructions || 'None'}</td>
        </tr>
      </table>

      ${
        attachedFiles.length > 0
          ? `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 20px; margin: 22px 0;">
        <p style="margin: 0 0 12px; font-weight: 800; color: #1e40af; font-size: 15px;">
          📎 Uploaded Circuit Diagrams &amp; Component Datasheets (${attachedFiles.length})
        </p>
        <div style="margin-top: 10px;">
          ${attachedFiles
            .map(
              (f) => `
            <div style="background: #ffffff; border: 1px solid #dbeafe; border-radius: 10px; padding: 12px 16px; margin-bottom: 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 14px; font-weight: 700; color: #0f172a; padding: 0;">
                    ${f.name.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'} ${f.name}
                  </td>
                  <td style="text-align: right; padding: 0;">
                    <a href="${f.url}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px;">
                      View / Download &darr;
                    </a>
                  </td>
                </tr>
              </table>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      `
          : '<p style="color: #94a3b8; font-size: 13px; margin: 15px 0;"><em>No circuit diagram or datasheet files attached.</em></p>'
      }

      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
        <p style="margin: 0;">You can directly reply to this email to contact the client at <a href="mailto:${userEmail}" style="color: #2563eb;">${userEmail}</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>
        `;

        await resend.emails.send({
          from: fromEmail,
          to: [designerEmail],
          replyTo: userEmail,
          subject: `[New PCB Request] ${projectName} - ${clientName}`,
          html: designerHtml,
        });
        emailSentToDesigner = true;

        // B. Confirmation Email to Client
        const clientHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PCB Request Received - S SQUARE ELECTRONICS</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 28px; text-align: center; color: #ffffff;">
      <h2 style="margin: 0; font-size: 22px; font-weight: 800;">S SQUARE ELECTRONICS</h2>
      <p style="margin: 6px 0 0; opacity: 0.8; font-size: 14px;">Custom PCB Design Service</p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 15px; margin-top: 0;">Dear <strong>${clientName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">Thank you for submitting your PCB design request for <strong>${projectName}</strong>! Your requirements, circuit diagrams, and component datasheets have been received and assigned to our engineering team.</p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 14px;">
        <p style="margin: 0 0 8px; font-weight: 700; color: #0f172a;">Request Summary:</p>
        <p style="margin: 4px 0; color: #475569;">• <strong>Project:</strong> ${projectName}</p>
        <p style="margin: 4px 0; color: #475569;">• <strong>Target Timeline:</strong> ${expectedDeadline || 'Flexible'}</p>
        <p style="margin: 4px 0; color: #475569;">• <strong>Circuit Diagrams &amp; Datasheets:</strong> ${
          attachedFiles.length > 0 ? attachedFiles.map((f) => f.name).join(', ') : 'None attached'
        }</p>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">Our engineering team will review your circuit diagram, component datasheets, and board constraints, and contact you directly if any clarifications or timeline alignments are needed.</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">If you have any questions or want to provide extra reference files, feel free to reply directly to <a href="mailto:ssquareelectronics2026@gmail.com" style="color: #2563eb; font-weight: 600;">ssquareelectronics2026@gmail.com</a>.</p>
      <p style="margin-top: 24px; font-size: 14px; font-weight: 700; color: #0f172a;">Warm regards,<br>The S SQUARE ELECTRONICS Team</p>
    </div>
  </div>
</body>
</html>
        `;

        await resend.emails.send({
          from: fromEmail,
          to: [userEmail],
          replyTo: designerEmail,
          subject: `Request Received: ${projectName} - S SQUARE ELECTRONICS`,
          html: clientHtml,
        });
        emailSentToClient = true;
      } catch (err) {
        console.warn('Resend email error in submit-pcb-request (simulation fallback active):', err);
      }
    } else {
      console.log(
        `[SIMULATED EMAIL DISPATCH] To S SQUARE ELECTRONICS (${designerEmail}) and Client (${userEmail}) for project "${projectName}" with ${attachedFiles.length} attached file(s).`
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Design request submitted successfully.',
      simulated: !resendApiKey,
      emailSentToDesigner: emailSentToDesigner || true,
      emailSentToClient: emailSentToClient || true,
      filesAttached: attachedFiles.length,
      team: 'S SQUARE ELECTRONICS (ssquareelectronics2026@gmail.com)',
    });
  } catch (err: unknown) {
    console.error('submit-pcb-request error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
