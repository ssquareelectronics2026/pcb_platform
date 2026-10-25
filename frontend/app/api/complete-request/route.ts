import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

/**
 * Extracts storage bucket and file path from a Supabase Storage public URL
 */
function extractStoragePathAndBucket(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url || typeof url !== 'string') return null;

  // 1. Matches /request_files/<filePath>
  if (url.includes('/request_files/')) {
    const parts = url.split('/request_files/');
    if (parts.length > 1 && parts[1]) {
      const cleanPath = decodeURIComponent(parts[1].split('?')[0]).replace(/^\/+/, '');
      return { bucket: 'request_files', path: cleanPath };
    }
  }

  // 2. Matches /pcb_components/<filePath>
  if (url.includes('/pcb_components/')) {
    const parts = url.split('/pcb_components/');
    if (parts.length > 1 && parts[1]) {
      const cleanPath = decodeURIComponent(parts[1].split('?')[0]).replace(/^\/+/, '');
      return { bucket: 'pcb_components', path: cleanPath };
    }
  }

  return null;
}

/**
 * Extracts all unique Supabase storage paths from an array of strings/URLs
 */
function extractAllStorageFiles(sources: (string | null | undefined)[]): {
  request_files: string[];
  pcb_components: string[];
} {
  const requestFilesSet = new Set<string>();
  const pcbComponentsSet = new Set<string>();

  for (const src of sources) {
    if (!src || typeof src !== 'string') continue;

    // Direct URL check
    const directMatch = extractStoragePathAndBucket(src);
    if (directMatch) {
      if (directMatch.bucket === 'request_files') requestFilesSet.add(directMatch.path);
      if (directMatch.bucket === 'pcb_components') pcbComponentsSet.add(directMatch.path);
    }

    // Embedded URLs check (e.g. in multi-file descriptions)
    const urlMatches = src.match(/https?:\/\/[^\s\)\"\'>]+/g);
    if (urlMatches) {
      for (const matchedUrl of urlMatches) {
        const item = extractStoragePathAndBucket(matchedUrl);
        if (item) {
          if (item.bucket === 'request_files') requestFilesSet.add(item.path);
          if (item.bucket === 'pcb_components') pcbComponentsSet.add(item.path);
        }
      }
    }
  }

  return {
    request_files: Array.from(requestFilesSet),
    pcb_components: Array.from(pcbComponentsSet),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      requestId,
      adminSecret,
      requestType, // 'project' | 'component'
      componentName,
      userEmail,
      componentId,
      gerberUrl,
      gerberFileName,
      manufacturingNotes,
    } = body;

    // 1. Verify Admin Secret
    const validSecret = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
    if (adminSecret !== validSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid admin secret key.' }, { status: 401 });
    }

    if (!requestId) {
      return NextResponse.json({ error: 'Missing required field: requestId.' }, { status: 400 });
    }

    // 2. Initialize Supabase Client (uses Service Role Key when available to bypass RLS for cleanup)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Fetch Existing Request from Supabase
    const { data: existingRequest } = await supabase
      .from('component_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    // 4. Update Request Status in Supabase (keeps database history intact)
    const updatePayload: Record<string, unknown> = {
      status: 'Completed',
      completed_at: new Date().toISOString(),
    };

    if (gerberUrl) {
      updatePayload.component_link = gerberUrl;
      if (existingRequest?.description && !existingRequest.description.includes('[Gerber Files]:')) {
        updatePayload.description = `${existingRequest.description}\n\n[Gerber Files]: ${gerberUrl}`;
      }
    }

    let { data: updatedRequest, error: dbError } = await supabase
      .from('component_requests')
      .update(updatePayload)
      .eq('id', requestId)
      .select()
      .single();

    if (dbError && gerberUrl) {
      // Fallback if component_link column is restricted
      const fallback = await supabase
        .from('component_requests')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();
      updatedRequest = fallback.data;
      dbError = fallback.error;
    }

    if (dbError) {
      console.error('Database update error in complete-request:', dbError);
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    // 5. Determine Request Category (PCB Project vs Component)
    const rawName = (componentName || existingRequest?.component_name || 'PCB Item').trim();
    const isProject =
      requestType === 'project' ||
      Boolean(gerberUrl) ||
      rawName.toLowerCase().includes('[pcb project]') ||
      rawName.toLowerCase().startsWith('project:') ||
      (existingRequest?.description && existingRequest.description.includes('Client / Company:'));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pcb-platform.vercel.app';
    const targetEmail = userEmail || existingRequest?.user_email;

    let emailSent = false;
    let warning: string | undefined = undefined;
    let directUrl = siteUrl;

    // 6. Handle PCB Project Design Completion Workflow
    if (isProject) {
      const cleanProjectName = rawName
        .replace(/^\[PCB Project\]\s*/i, '')
        .replace(/^project:\s*/i, '')
        .trim();

      const clientMatch = existingRequest?.description?.match(/Client \/ Company:\s*(.+)/i);
      const clientName = clientMatch ? clientMatch[1].trim() : 'Valued Client';

      const finalGerberUrl = gerberUrl || existingRequest?.component_link || siteUrl;
      directUrl = finalGerberUrl;

      const notes =
        manufacturingNotes ||
        'Standard 2-Layer FR4 1.6mm thickness, 1oz Copper, Green Solder Mask, White Silkscreen, Lead-Free HASL finish. 100% Design Rule Check (DRC) passed.';

      if (targetEmail) {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          try {
            const resend = new Resend(resendApiKey);
            const fromEmail = process.env.EMAIL_FROM || 'S SQUARE ELECTRONICS <onboarding@resend.dev>';

            // Fetch Gerber file to attach directly to email before storage deletion
            let gerberAttachmentBuffer: Buffer | null = null;
            if (finalGerberUrl && finalGerberUrl.startsWith('http')) {
              try {
                const fileRes = await fetch(finalGerberUrl);
                if (fileRes.ok) {
                  const arrayBuffer = await fileRes.arrayBuffer();
                  gerberAttachmentBuffer = Buffer.from(arrayBuffer);
                }
              } catch (fetchErr) {
                console.warn('Could not pre-fetch Gerber file for direct email attachment:', fetchErr);
              }
            }

            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your PCB Design & Gerber Files are Ready! - ${cleanProjectName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">
        ⚡ S SQUARE ELECTRONICS
      </h1>
      <p style="color: #93c5fd; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin: 6px 0 0 0;">
        Custom PCB Hardware Engineering
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 36px;">
      <p style="font-size: 16px; color: #1e293b; margin-top: 0; margin-bottom: 20px; font-weight: 600;">
        Dear ${clientName},
      </p>

      <p style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
        We are thrilled to inform you that our engineering team at <strong>S SQUARE ELECTRONICS</strong> has completed the circuit design, routing, and design-rule verification (DRC) for your custom project: <strong>${cleanProjectName}</strong>.
      </p>

      <!-- Gerber Delivery Box -->
      <div style="background-color: #f8fafc; border-radius: 14px; padding: 24px; margin-bottom: 28px; border-left: 5px solid #2563eb; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">
          📦 Production-Ready Gerber Files
        </p>
        <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800; color: #0f172a;">
          ${cleanProjectName}
        </p>
        <p style="margin: 6px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
          Your manufacturing package has been verified and attached directly to this email as a production-ready ZIP archive (<strong>${cleanProjectName}_Gerber.zip</strong>). It contains all copper layers (Top &amp; Bottom), solder mask, silkscreen, board outline, and Excellon NC drill files.
        </p>
      </div>

      <!-- Call to Action Button: Download Gerber Files -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${finalGerberUrl}" download="${cleanProjectName}_Gerber.zip" target="_blank" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 16px 38px; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); letter-spacing: -0.01em;">
          Download Gerber Files &darr;
        </a>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #64748b; text-align: center; margin-bottom: 28px;">
        Direct archive link: <a href="${finalGerberUrl}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${finalGerberUrl}</a>
      </p>

      <!-- Instant Manufacturing Ordering Guide -->
      <div style="background-color: #f0fdf4; border-radius: 14px; padding: 22px 24px; margin-bottom: 26px; border: 1px solid #bbf7d0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 800; color: #166534;">
          🚀 Ready for Instant PCB Manufacturing:
        </p>
        <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.6;">
          You can directly upload the attached ZIP archive without unzipping to any PCB fabrication portal to place your fabrication order:
        </p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 13px; color: #166534; line-height: 1.7;">
          <li><strong>JLC PCB</strong> (<a href="https://jlcpcb.com" target="_blank" style="color: #15803d; font-weight: 600;">jlcpcb.com</a>) — Standard 2-Layer &amp; Multi-Layer quick turn</li>
          <li><strong>Lion Circuits</strong> (<a href="https://lioncircuits.com" target="_blank" style="color: #15803d; font-weight: 600;">lioncircuits.com</a>) — Fast Indian domestic PCB fabrication &amp; assembly</li>
          <li><strong>PCBWay</strong> (<a href="https://pcbway.com" target="_blank" style="color: #15803d; font-weight: 600;">pcbway.com</a>) — Rapid prototyping &amp; SMD stencil manufacturing</li>
        </ul>
      </div>

      <!-- Engineering & Layer Specifications -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px 22px; margin-bottom: 26px; border: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">
          Engineering &amp; Board Specifications
        </p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${notes}</p>
      </div>

      <!-- Formal Contact Box -->
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 18px 22px; margin-bottom: 30px; border: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
          If you need layout revisions, schematic source files, or bill of materials (BOM) assistance, simply reply directly to this email or reach us at <a href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Project%20Design%20-%20${encodeURIComponent(cleanProjectName)}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">ssquareelectronics2026@gmail.com</a>.
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
          Empowering hardware engineers with custom PCB design &amp; manufacturing support.
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

            const emailText = `Dear ${clientName},\n\nWe are pleased to inform you that our engineering team at S SQUARE ELECTRONICS has completed the circuit design, routing, and design-rule verification (DRC) for your custom project: ${cleanProjectName}.\n\nYour production-ready Gerber Files (${cleanProjectName}_Gerber.zip) are attached directly to this email.\nArchive Link: ${finalGerberUrl}\n\nManufacturing Guide:\nYou can upload this ZIP archive directly without unzipping to any PCB manufacturing portal such as JLC PCB (https://jlcpcb.com), Lion Circuits (https://lioncircuits.com), or PCBWay (https://pcbway.com).\n\nSpecifications:\n${notes}\n\nIf you have any questions or require revisions, reply to this email or reach us at ssquareelectronics2026@gmail.com.\n\nSincerely,\nThe S SQUARE ELECTRONICS Team`;

            const resendPayload: {
              from: string;
              to: string[];
              replyTo: string;
              subject: string;
              html: string;
              text: string;
              attachments?: { filename: string; content: Buffer }[];
            } = {
              from: fromEmail,
              to: [targetEmail],
              replyTo: 'ssquareelectronics2026@gmail.com',
              subject: `Your PCB Design & Gerber Files are Ready! - ${cleanProjectName} | S SQUARE ELECTRONICS`,
              html: emailHtml,
              text: emailText,
            };

            if (gerberAttachmentBuffer) {
              resendPayload.attachments = [
                {
                  filename: `${cleanProjectName}_Gerber.zip`,
                  content: gerberAttachmentBuffer,
                },
              ];
            }

            const { error: resendError } = await resend.emails.send(resendPayload);

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
          warning = 'RESEND_API_KEY is not configured in environment variables. Request marked Completed without live email.';
        }
      } else {
        warning = 'No client email was associated with this project request.';
      }
    } else {
      // 7. Handle Component Request Completion Workflow
      const cleanCompName = rawName.replace(/^\[Component\]\s*/i, '').trim();

      // Resolve Direct Component Link
      let linkedComponentId = componentId || null;

      if (!linkedComponentId) {
        // Search components table for matching name
        const { data: matchedComp } = await supabase
          .from('components')
          .select('id, name')
          .ilike('name', `%${cleanCompName}%`)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (matchedComp) {
          linkedComponentId = matchedComp.id;
        }
      }

      if (linkedComponentId) {
        directUrl = `${siteUrl}/components/${linkedComponentId}`;
      } else {
        directUrl = `${siteUrl}/components?search=${encodeURIComponent(cleanCompName)}`;
      }

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
        ⚡ S SQUARE ELECTRONICS
      </h1>
      <p style="color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 4px 0 0 0;">
        PCB Component Hub
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 36px;">
      <p style="font-size: 16px; color: #1e293b; margin-top: 0; margin-bottom: 20px; font-weight: 600;">
        Dear User,
      </p>

      <p style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
        We are pleased to inform you that your requested PCB component (<strong>${cleanCompName}</strong>) has been successfully created, verified, and uploaded to <strong>S SQUARE ELECTRONICS PCB Component Hub</strong>.
      </p>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 22px 24px; margin-bottom: 30px; border-left: 4px solid #2563eb; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">
          Component Information
        </p>
        <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #0f172a;">
          ${cleanCompName}
        </p>
        <p style="margin: 6px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.5;">
          The schematic symbol (.kicad_sym) and PCB footprint (.kicad_mod) files are now ready for immediate download and integration into your KiCAD projects.
        </p>
      </div>

      <!-- Direct Link Call to Action Button: View Symbol & Footprint -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${directUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); letter-spacing: -0.01em;">
          View Symbol &amp; Footprint &rarr;
        </a>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #64748b; text-align: center; margin-bottom: 28px;">
        Or access directly via: <a href="${directUrl}" style="color: #2563eb; text-decoration: underline;">${directUrl}</a>
      </p>

      <!-- KiCAD Tutorial Quick Tip Box -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px 22px; margin-bottom: 26px; border: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
          💡 <strong>Need help adding this to KiCAD?</strong> Check our step-by-step Symbol and Footprint tutorials on the platform for complete guidance on adding libraries to KiCAD.
        </p>
      </div>

      <!-- Formal Contact Box -->
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 18px 22px; margin-bottom: 30px; border: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
          If you have any questions or require revisions regarding your component request, you can directly reply to this email or reach us at <a href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Component%20Request%20-%20${encodeURIComponent(cleanCompName)}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">ssquareelectronics2026@gmail.com</a>.
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

            const emailText = `Dear User,\n\nWe are pleased to inform you that your requested PCB component (${cleanCompName}) has been successfully created, verified, and uploaded to S SQUARE ELECTRONICS PCB Component Hub.\n\nYou can access and view it directly on our platform:\n${directUrl}\n\nIf you have any questions or require revisions regarding your component request, you can directly reply to this email or reach us at ssquareelectronics2026@gmail.com.\n\nSincerely,\nThe S SQUARE ELECTRONICS Team`;

            const { error: resendError } = await resend.emails.send({
              from: fromEmail,
              to: [targetEmail],
              replyTo: 'ssquareelectronics2026@gmail.com',
              subject: `Your requested PCB component (${cleanCompName}) is now available on PCB Component Hub!`,
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
    }

    // 8. AUTOMATIC STORAGE CLEANUP WORKFLOW:
    // Extract and delete all physical files from Supabase Storage to keep free-tier quota pristine.
    // Preserves database record in `component_requests` for history tracking.
    const storageTargets = extractAllStorageFiles([
      existingRequest?.file_url,
      existingRequest?.component_link,
      existingRequest?.description,
      gerberUrl,
      updatedRequest?.file_url,
      updatedRequest?.component_link,
    ]);

    let filesDeletedCount = 0;
    const deletedSummary: string[] = [];

    // A. Wipe all intake files from `request_files` (circuit diagrams, datasheets, PDFs, images)
    if (storageTargets.request_files.length > 0) {
      try {
        const { error: reqStorageError } = await supabase.storage
          .from('request_files')
          .remove(storageTargets.request_files);

        if (reqStorageError) {
          console.warn('[STORAGE CLEANUP] Warning removing from request_files:', reqStorageError.message);
        } else {
          filesDeletedCount += storageTargets.request_files.length;
          deletedSummary.push(`request_files: ${storageTargets.request_files.length} file(s)`);
          console.log(`[STORAGE CLEANUP] Removed from request_files:`, storageTargets.request_files);
        }
      } catch (err) {
        console.warn('[STORAGE CLEANUP] Error in request_files cleanup:', err);
      }
    }

    // B. Wipe Gerber archives from `pcb_components` (strictly leaves catalog components intact)
    const gerberFilesToDelete = storageTargets.pcb_components.filter(
      (path) => path.startsWith('gerbers/') || path.toLowerCase().includes('gerber') || path.toLowerCase().endsWith('.zip')
    );

    if (gerberFilesToDelete.length > 0) {
      try {
        const { error: pcbStorageError } = await supabase.storage
          .from('pcb_components')
          .remove(gerberFilesToDelete);

        if (pcbStorageError) {
          console.warn('[STORAGE CLEANUP] Warning removing from pcb_components:', pcbStorageError.message);
        } else {
          filesDeletedCount += gerberFilesToDelete.length;
          deletedSummary.push(`pcb_components: ${gerberFilesToDelete.length} file(s)`);
          console.log(`[STORAGE CLEANUP] Removed from pcb_components:`, gerberFilesToDelete);
        }
      } catch (err) {
        console.warn('[STORAGE CLEANUP] Error in pcb_components cleanup:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Request marked as Completed and storage cleaned up.',
      emailSent,
      warning,
      requestType: isProject ? 'project' : 'component',
      directUrl,
      storageCleanup: {
        filesDeleted: filesDeletedCount,
        summary: deletedSummary,
      },
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
