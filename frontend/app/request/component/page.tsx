'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, Info, Loader2 } from 'lucide-react';

function sanitizeFileName(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.');
  let base = originalName;
  let ext = '';

  if (lastDot > 0) {
    base = originalName.slice(0, lastDot);
    ext = originalName.slice(lastDot);
  }

  const cleanBase = base
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const cleanExt = ext.replace(/[^a-zA-Z0-9._-]/g, '');

  return `${Date.now()}_${cleanBase || 'component'}${cleanExt}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function RequestComponentPage() {
  const [componentName, setComponentName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [componentLink, setComponentLink] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    const trimmedName = componentName.trim();
    const trimmedEmail = userEmail.trim();
    let trimmedLink = componentLink.trim();
    const trimmedDesc = description.trim();

    // 1. Validate required fields
    if (!trimmedName) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter the Component Name or Part Number.',
      });
      setLoading(false);
      return;
    }

    if (!trimmedEmail) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter your Email Address so we can notify you when completed.',
      });
      setLoading(false);
      return;
    }

    // 2. Format Reference Link if provided
    if (trimmedLink) {
      if (!/^https?:\/\//i.test(trimmedLink)) {
        trimmedLink = `https://${trimmedLink}`;
      }
      try {
        new URL(trimmedLink);
      } catch {
        setStatusMessage({
          type: 'error',
          text: 'The provided Component Link is not a valid URL. Please check and try again.',
        });
        setLoading(false);
        return;
      }
    }

    // 3. Flexible Validation: EITHER Datasheet Link OR File/Image must be provided
    const hasLink = Boolean(trimmedLink);
    const hasFile = Boolean(file);

    if (!hasLink && !hasFile) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide at least one proof or reference: either a Datasheet Link (URL) or an attached Datasheet / Image file.',
      });
      setLoading(false);
      return;
    }

    try {
      let fileUrl: string | null = null;

      // 4. Sanitize and upload file to Supabase Storage if present
      if (file) {
        const fileName = sanitizeFileName(file.name);
        const { error: uploadError } = await supabase.storage
          .from('request_files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('request_files')
          .getPublicUrl(fileName);

        fileUrl = publicUrlData.publicUrl;
      }

      // 5. Insert into Supabase component_requests table
      const { error: dbError } = await supabase.from('component_requests').insert([
        {
          component_name: trimmedName,
          user_email: trimmedEmail,
          component_link: trimmedLink || null,
          description: trimmedDesc,
          file_url: fileUrl,
          status: 'Pending',
        },
      ]);

      if (dbError) {
        if (dbError.message?.includes('component_link')) {
          const fallbackDesc = trimmedLink
            ? trimmedDesc
              ? `${trimmedDesc}\n\nReference Link: ${trimmedLink}`
              : `Reference Link: ${trimmedLink}`
            : trimmedDesc;

          const { error: fallbackError } = await supabase
            .from('component_requests')
            .insert([
              {
                component_name: trimmedName,
                user_email: trimmedEmail,
                description: fallbackDesc,
                file_url: fileUrl,
                status: 'Pending',
              },
            ]);
          if (fallbackError) throw fallbackError;
        } else {
          throw dbError;
        }
      }

      // 6. Send Telegram Notification if configured
      const telegramBotToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

      if (telegramBotToken && telegramChatId) {
        const safeName = escapeHtml(trimmedName);
        const safeEmail = escapeHtml(trimmedEmail);
        const safeLink = trimmedLink ? escapeHtml(trimmedLink) : '';
        const safeDesc = escapeHtml(trimmedDesc);

        const textMessage = fileUrl
          ? `<b>New Component Request</b>\n\n` +
            `<b>Name:</b> ${safeName}\n` +
            `<b>Email:</b> ${safeEmail}\n` +
            (safeLink ? `<b>Reference Link:</b> <a href="${safeLink}">${safeLink}</a>\n` : '') +
            `<b>Details:</b> ${safeDesc || 'Reference URL provided above'}\n\n` +
            `<b>Attachment:</b> <a href="${fileUrl}">${escapeHtml(file?.name || 'Attachment')}</a>`
          : `<b>New Component Request</b>\n\n` +
            `<b>Name:</b> ${safeName}\n` +
            `<b>Email:</b> ${safeEmail}\n` +
            (safeLink ? `<b>Reference Link:</b> <a href="${safeLink}">${safeLink}</a>\n` : '') +
            `<b>Details:</b> ${safeDesc || 'Reference URL provided above'}\n\n` +
            `<b>Attachment:</b> None`;

        fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: textMessage,
            parse_mode: 'HTML',
          }),
        }).catch((err) => console.warn('Telegram error:', err));
      }

      setStatusMessage({
        type: 'success',
        text: `Request for "${trimmedName}" submitted. We will build the symbol and footprint and email you at ${trimmedEmail} once it is published.`,
      });

      // Reset form
      setComponentName('');
      setUserEmail('');
      setComponentLink('');
      setDescription('');
      setFile(null);
      setFileInputKey(Date.now());
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'An error occurred while submitting your request.',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasLinkInput = Boolean(componentLink.trim());
  const hasDescInput = Boolean(description.trim());
  const hasFileInput = Boolean(file);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="space-y-3 border-b border-[#161513]/10 pb-6">
        <p className="font-mono text-xs text-[#9a6320]">
          S SQUARE ELECTRONICS · Library request
        </p>

        <h1 className="text-3xl sm:text-4xl font-medium text-[#161513] tracking-[-0.02em]">
          Request a component
        </h1>

        <p className="text-[#52504a] text-sm sm:text-base max-w-2xl leading-relaxed font-normal">
          Submit a missing schematic symbol or PCB footprint below and our engineering team will build and verify it for the catalog.
        </p>

        <div className="pt-1">
          <Link
            href="/request/project"
            className="text-sm font-medium text-[#9a6320] hover:text-[#7a4c14] inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop"
          >
            <span>Need a full board layout? Request project design</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      {/* Reference Requirement Callout */}
      <div className="bg-white border border-[#161513]/10 rounded-xl p-4 text-xs sm:text-sm text-[#52504a] flex items-start gap-3">
        <Info className="w-[18px] h-[18px] text-[#9a6320] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
        <div className="leading-relaxed">
          <span className="font-medium text-[#161513]">Proof or reference requirement: </span>
          Provide either a direct datasheet URL or attach a datasheet/image file. Supplying one makes the other optional.
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            statusMessage.type === 'error'
              ? 'bg-[#dc2626]/[0.06] text-[#991b1b] border-[#dc2626]/20'
              : 'bg-[#167c4c]/[0.08] text-[#115e39] border-[#167c4c]/25'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-[18px] h-[18px] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          ) : (
            <CheckCircle2 className="w-[18px] h-[18px] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          )}
          <span>{statusMessage.text}</span>
        </motion.div>
      )}

      {/* Request Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#161513]/10 p-6 sm:p-8 rounded-2xl space-y-6"
      >
        {/* Component Name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#161513]">
            Component name / part number <span className="text-[#dc2626]">*</span>
          </label>
          <input
            type="text"
            required
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            placeholder="ATmega328P-AU, ESP32-WROOM-32D, TPS54302"
            className="w-full h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] font-mono text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
          />
        </div>

        {/* User Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#161513]">
            Your email address <span className="text-[#dc2626]">*</span>
          </label>
          <input
            type="email"
            required
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="engineer@example.com"
            className="w-full h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
          />
          <p className="text-xs text-[#76736c]">
            We send an automated notification email once the component files are published.
          </p>
        </div>

        {/* Component Link / Reference URL */}
        <div className="pt-4 border-t border-[#161513]/8 space-y-1.5">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <label className="block text-sm font-medium text-[#161513]">
              Datasheet link / reference URL{' '}
              {!hasFileInput && <span className="text-[#dc2626]">*</span>}
            </label>
            <span
              className={`font-mono text-xs ${
                hasLinkInput
                  ? 'text-[#167c4c]'
                  : hasFileInput
                    ? 'text-[#76736c]'
                    : 'text-[#9a6320]'
              }`}
            >
              {hasLinkInput
                ? 'Link provided'
                : hasFileInput
                  ? 'Optional (file attached)'
                  : 'Required without file'}
            </span>
          </div>
          <input
            type="text"
            value={componentLink}
            onChange={(e) => setComponentLink(e.target.value)}
            placeholder="https://www.lcsc.com/product-detail/..."
            className="w-full h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] font-mono text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
          />
          <p className="text-xs text-[#76736c]">
            Direct link to manufacturer datasheet, LCSC, Mouser, or DigiKey product page.
          </p>
        </div>

        {/* Details & Requirements */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-2">
            <label className="block text-sm font-medium text-[#161513]">
              Details &amp; package requirements
            </label>
            <span className="font-mono text-xs text-[#76736c]">
              {hasDescInput ? 'Provided' : 'Optional'}
            </span>
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Package type (e.g. SOIC-8, QFN-32, 0805), pin pitch, or footprint variations"
            className="w-full bg-[#f6f5f1] border border-[#161513]/12 rounded-lg p-4 text-[#161513] text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
          />
        </div>

        {/* File Upload */}
        <div className="pt-4 border-t border-[#161513]/8 space-y-2">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <label className="block text-sm font-medium text-[#161513]">
              Attach datasheet / image{' '}
              {!hasLinkInput && <span className="text-[#dc2626]">*</span>}
            </label>
            <span
              className={`font-mono text-xs ${
                hasFileInput
                  ? 'text-[#167c4c]'
                  : hasLinkInput
                    ? 'text-[#76736c]'
                    : 'text-[#9a6320]'
              }`}
            >
              {hasFileInput
                ? 'File selected'
                : hasLinkInput
                  ? 'Optional (link provided)'
                  : 'Required without link'}
            </span>
          </div>
          <div className="bg-[#f6f5f1] border border-[#161513]/12 rounded-lg p-3">
            <input
              key={fileInputKey}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs sm:text-sm text-[#52504a] file:mr-4 file:h-9 file:px-4 file:rounded-md file:border file:border-[#161513]/12 file:text-xs file:font-medium file:bg-white file:text-[#161513] hover:file:bg-[#eeede8] cursor-pointer"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 px-5 bg-[#161513] hover:bg-[#2a2824] text-white font-medium text-sm rounded-lg transition-colors duration-150 ease-unslop flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                <span>Submitting request</span>
              </>
            ) : (
              <>
                <span>Submit component request</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Direct Contact */}
      <p className="text-center text-xs text-[#76736c]">
        Questions regarding a component footprint? Contact{' '}
        <a
          href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Component%20Request"
          className="font-mono text-[#9a6320] hover:text-[#7a4c14] underline underline-offset-2 transition-colors duration-150 ease-unslop"
        >
          ssquareelectronics2026@gmail.com
        </a>
      </p>
    </div>
  );
}
