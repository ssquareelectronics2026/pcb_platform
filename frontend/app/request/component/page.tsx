'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import Link from 'next/link';

function sanitizeFileName(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.');
  let base = originalName;
  let ext = '';

  if (lastDot > 0) {
    base = originalName.slice(0, lastDot);
    ext = originalName.slice(lastDot);
  }

  const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
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
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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
      setStatusMessage({ type: 'error', text: 'Please enter the Component Name or Part Number.' });
      setLoading(false);
      return;
    }

    if (!trimmedEmail) {
      setStatusMessage({ type: 'error', text: 'Please enter your Email Address so we can notify you when completed.' });
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
        setStatusMessage({ type: 'error', text: 'The provided Component Link is not a valid URL. Please check and try again.' });
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
        text: 'Please provide at least one proof or reference: either a Datasheet Link (URL) OR an attached Datasheet / Image file.',
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
      const { error: dbError } = await supabase
        .from('component_requests')
        .insert([
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
            ? (trimmedDesc ? `${trimmedDesc}\n\nReference Link: ${trimmedLink}` : `Reference Link: ${trimmedLink}`)
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
          ? `🚀 <b>New Component Request!</b>\n\n` +
            `📌 <b>Name:</b> ${safeName}\n` +
            `📧 <b>Email:</b> ${safeEmail}\n` +
            (safeLink ? `🔗 <b>Reference Link:</b> <a href="${safeLink}">${safeLink}</a>\n` : '') +
            `📝 <b>Details:</b> ${safeDesc || 'Reference URL provided above'}\n\n` +
            `📂 <b>Attachment:</b> <a href="${fileUrl}">${escapeHtml(file?.name || 'Attachment')}</a>`
          : `🚀 <b>New Component Request!</b>\n\n` +
            `📌 <b>Name:</b> ${safeName}\n` +
            `📧 <b>Email:</b> ${safeEmail}\n` +
            (safeLink ? `🔗 <b>Reference Link:</b> <a href="${safeLink}">${safeLink}</a>\n` : '') +
            `📝 <b>Details:</b> ${safeDesc || 'Reference URL provided above'}\n\n` +
            `📂 <b>Attachment:</b> None`;

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
        text: `Request for "${trimmedName}" submitted successfully! We will create the symbol/footprint and email you at ${trimmedEmail} when it's ready for download.`,
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
        text: err instanceof Error ? err.message : 'An error occurred while submitting your request.',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasLinkInput = Boolean(componentLink.trim());
  const hasDescInput = Boolean(description.trim());
  const hasFileInput = Boolean(file);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 relative z-10">
      
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider shadow-sm">
          <span>⚡ S SQUARE ELECTRONICS</span>
          <span className="text-slate-300">•</span>
          <span>KiCAD Component Library</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Request a Component
        </h1>

        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Can&apos;t find a specific schematic symbol or PCB footprint in our catalog? Submit the part details below, and our engineering team will create and verify it for you.
        </p>

        {/* Navigation pill pointing to project design if that's what user needs */}
        <div className="pt-2">
          <Link
            href="/request/project"
            className="text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-full px-4 py-2 transition-all inline-flex items-center gap-1.5"
          >
            <span>Need a full board layout instead?</span>
            <span className="text-blue-600 font-extrabold">Request Project Design &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Helper Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 mb-6 text-xs sm:text-sm text-blue-950 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">💡</span>
        <div className="leading-relaxed">
          <span className="font-bold">Proof / Reference Requirement:</span> You must provide at least one proof or reference for your component: either provide a direct <strong>Datasheet Link (URL)</strong> <em>or</em> upload a <strong>Datasheet / Image file</strong>. Providing either one makes the other optional!
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-2xl mb-6 font-bold shadow-sm border text-sm ${
            statusMessage.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {statusMessage.text}
        </motion.div>
      )}

      {/* Request Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-6 sm:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-6">
        
        {/* Component Name */}
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
            Component Name / Part Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            placeholder="e.g. ATmega328P-AU, ESP32-WROOM-32D, or TPS54302"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          />
        </div>

        {/* User Email */}
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
            Your Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="e.g. engineer@example.com"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            We will automatically send you an email notification as soon as this component is uploaded and ready for download!
          </p>
        </div>

        {/* Component Link / Reference URL */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Datasheet Link / Reference URL {!hasFileInput && <span className="text-red-500">*</span>}
            </label>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${hasLinkInput ? 'bg-emerald-100 text-emerald-800' : hasFileInput ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
              {hasLinkInput ? '✓ Link provided' : hasFileInput ? 'Optional (File attached)' : 'Required if no file uploaded *'}
            </span>
          </div>
          <input
            type="text"
            value={componentLink}
            onChange={(e) => setComponentLink(e.target.value)}
            placeholder="e.g. https://www.lcsc.com/product-detail/... or Mouser / DigiKey URL"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Direct link to manufacturer datasheet, LCSC, Mouser, or DigiKey page.
          </p>
        </div>

        {/* Details & Requirements */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Details &amp; Package Requirements
            </label>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {hasDescInput ? '✓ Details provided' : 'Optional'}
            </span>
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specify package type (e.g. SOIC-8, QFN-32, 0805), pin pitch, footprint variations, or special dimensions..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          ></textarea>
        </div>

        {/* File Upload */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Attach Datasheet / Image {!hasLinkInput && <span className="text-red-500">*</span>}
            </label>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${hasFileInput ? 'bg-emerald-100 text-emerald-800' : hasLinkInput ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
              {hasFileInput ? '✓ File selected' : hasLinkInput ? 'Optional (Link provided)' : 'Required if no link provided *'}
            </span>
          </div>
          <input
            key={fileInputKey}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs sm:text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer transition-colors"
          />
        </div>

        {/* Submit Button */}
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <span>Submit Component Request</span>
                <span>&rarr;</span>
              </>
            )}
          </button>
        </motion.div>
      </form>

      {/* Direct Contact */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <p>
          Questions regarding a component footprint? Reach out directly to{' '}
          <a
            href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Component%20Request"
            className="text-blue-600 hover:text-blue-800 font-bold underline transition-colors"
          >
            ssquareelectronics2026@gmail.com
          </a>
        </p>
      </div>

    </div>
  );
}
