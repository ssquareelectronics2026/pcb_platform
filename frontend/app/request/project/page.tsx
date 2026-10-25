'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
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

  return `${Date.now()}_${cleanBase || 'circuit'}${cleanExt}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function RequestProjectPage() {
  // Form State
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [circuitFile, setCircuitFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [componentList, setComponentList] = useState('');
  const [boardConstraints, setBoardConstraints] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [expectedDeadline, setExpectedDeadline] = useState('');

  // Status State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    projectName: string;
    clientName: string;
    userEmail: string;
    expectedDeadline: string;
    fileName?: string;
  } | null>(null);

  // Helper for quick deadline presets
  const setDeadlinePreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    setExpectedDeadline(target.toISOString().split('T')[0]);
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const trimmedProject = projectName.trim();
    const trimmedClient = clientName.trim();
    const trimmedEmail = userEmail.trim();
    const trimmedComponents = componentList.trim();
    const hasCircuitFile = Boolean(circuitFile);
    const hasComponentReferences = Boolean(trimmedComponents);

    if (!trimmedProject) {
      setErrorMessage('Please enter your Project Name.');
      setLoading(false);
      return;
    }

    if (!trimmedClient) {
      setErrorMessage('Please enter your Client / Company Name.');
      setLoading(false);
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Please enter your Email Address.');
      setLoading(false);
      return;
    }

    // Circuit Diagram / Component References is strictly Mandatory (either file or references required)
    if (!hasCircuitFile && !hasComponentReferences) {
      setErrorMessage('Please provide either a Circuit Diagram file upload OR your Component References & Datasheets so our designer can engineer your board.');
      setLoading(false);
      return;
    }

    try {
      let fileUrl: string | null = null;
      let uploadedFileName = '';

      // 1. Upload Circuit Diagram file if provided
      if (circuitFile) {
        uploadedFileName = sanitizeFileName(circuitFile.name);
        const { error: uploadError } = await supabase.storage
          .from('request_files')
          .upload(uploadedFileName, circuitFile);

        if (uploadError) {
          console.warn('File upload note:', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('request_files')
            .getPublicUrl(uploadedFileName);
          fileUrl = publicUrlData.publicUrl;
        }
      }

      // 2. Structured Description
      const structuredDescription = [
        `Client / Company: ${trimmedClient}`,
        `Target Deadline: ${expectedDeadline || 'Flexible'}`,
        `Board Constraints: ${boardConstraints.trim() || 'No specific restrictions'}`,
        `Component References: ${componentList.trim() || 'None specified'}`,
        `Special Instructions: ${specialInstructions.trim() || 'None'}`,
      ].join('\n');

      // 3. Insert into Supabase component_requests
      const { error: dbError } = await supabase
        .from('component_requests')
        .insert([
          {
            component_name: `[PCB Project] ${trimmedProject}`,
            user_email: trimmedEmail,
            component_link: componentList.trim() || null,
            description: structuredDescription,
            file_url: fileUrl,
            status: 'Pending',
          },
        ]);

      if (dbError) {
        console.warn('Database note:', dbError);
      }

      // 4. Dispatch Email to Santhosh & Client via API route
      try {
        await fetch('/api/submit-pcb-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: trimmedProject,
            clientName: trimmedClient,
            userEmail: trimmedEmail,
            fileUrl,
            fileName: circuitFile?.name,
            componentList: componentList.trim(),
            boardConstraints: boardConstraints.trim(),
            specialInstructions: specialInstructions.trim(),
            expectedDeadline: expectedDeadline || 'Flexible',
          }),
        });
      } catch (apiErr) {
        console.warn('Email API note:', apiErr);
      }

      // 5. Telegram Notification if configured
      const telegramBotToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

      if (telegramBotToken && telegramChatId) {
        const textMessage = `⚡ <b>New Custom PCB Project Design Request!</b>\n\n` +
          `📌 <b>Project:</b> ${escapeHtml(trimmedProject)}\n` +
          `👤 <b>Client:</b> ${escapeHtml(trimmedClient)}\n` +
          `📧 <b>Email:</b> ${escapeHtml(trimmedEmail)}\n` +
          `📅 <b>Deadline:</b> ${escapeHtml(expectedDeadline || 'Flexible')}\n` +
          `📐 <b>Constraints:</b> ${escapeHtml(boardConstraints.trim() || 'None')}\n` +
          `🧩 <b>Components:</b> ${escapeHtml(componentList.trim() || 'None')}\n` +
          `📝 <b>Notes:</b> ${escapeHtml(specialInstructions.trim() || 'None')}\n\n` +
          (fileUrl ? `📂 <b>Circuit Diagram:</b> <a href="${fileUrl}">${escapeHtml(circuitFile?.name || 'View Diagram')}</a>` : '📂 <b>Circuit Diagram:</b> None attached');

        fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: textMessage,
            parse_mode: 'HTML',
          }),
        }).catch((tErr) => console.warn('Telegram error:', tErr));
      }

      // 6. Open sleek success confirmation modal
      setSubmittedData({
        projectName: trimmedProject,
        clientName: trimmedClient,
        userEmail: trimmedEmail,
        expectedDeadline: expectedDeadline || 'Flexible',
        fileName: circuitFile?.name,
      });

      setShowSuccessModal(true);

      // Reset form
      setProjectName('');
      setClientName('');
      setUserEmail('');
      setCircuitFile(null);
      setFileInputKey(Date.now());
      setComponentList('');
      setBoardConstraints('');
      setSpecialInstructions('');
      setExpectedDeadline('');
    } catch (err: unknown) {
      console.error('Submission error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred while submitting.');
    } finally {
      setLoading(false);
    }
  };

  const hasCircuitFile = Boolean(circuitFile);
  const hasComponentReferences = Boolean(componentList.trim());

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 relative z-10">
      
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider shadow-sm">
          <span>⚡ S SQUARE ELECTRONICS</span>
          <span className="text-slate-300">•</span>
          <span>Lead Designer: Santhosh</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Request Project Design
        </h1>

        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Need a complete PCB board designed for your hardware idea or circuit? Share your requirements and our lead designer <strong>Santhosh</strong> will design, route, and deliver a production-ready PCB.
        </p>

        {/* Navigation pill pointing to component request if that's what user needs */}
        <div className="pt-2">
          <Link
            href="/request/component"
            className="text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-full px-4 py-2 transition-all inline-flex items-center gap-1.5"
          >
            <span>Only need a single footprint or symbol?</span>
            <span className="text-blue-600 font-extrabold">Request Component &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Helper Banner for Mandatory & Optional Fields */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 mb-6 text-xs sm:text-sm text-slate-700 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">💡</span>
        <div className="leading-relaxed font-medium">
          <strong>Mandatory Information:</strong> Project Name, Client / Company Name, Email Address, and at least one technical reference (either a <strong>Circuit Diagram file upload</strong> <em>or</em> <strong>Component References / Datasheets</strong>) are strictly required. <strong>Constraints of Board</strong> is strictly optional!
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
          {errorMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-6 sm:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-6">
        
        {/* ROW 1: Project Name & Client/Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Smart Irrigation System, IoT Node"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
              Client / Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Alex Johnson or Apex Robotics"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            />
          </div>
        </div>

        {/* ROW 2: Email Address */}
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="e.g. client@example.com"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Designer Santhosh will send project progress, timeline updates, and completed PCB design files directly here.
          </p>
        </div>

        {/* ROW 3: Circuit Diagram Upload */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Circuit Diagram Upload {!hasComponentReferences && <span className="text-red-500">*</span>}
            </label>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${hasCircuitFile ? 'bg-emerald-100 text-emerald-800' : hasComponentReferences ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
              {hasCircuitFile ? '✓ File selected' : hasComponentReferences ? 'Optional (References provided)' : 'Required if no references *'}
            </span>
          </div>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <input
              key={fileInputKey}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={(e) => setCircuitFile(e.target.files?.[0] || null)}
              id="circuit-file-input"
              className="hidden"
            />
            <label htmlFor="circuit-file-input" className="cursor-pointer block space-y-2">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-xl shadow-inner">
                📁
              </div>
              <div>
                <span className="text-sm font-bold text-blue-600 hover:text-blue-700 underline">
                  {circuitFile ? circuitFile.name : 'Click to select Circuit Diagram'}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Attach a hand-drawn sketch, wiring diagram, block diagram, or PDF (.pdf, .png, .jpg, .jpeg)
                </p>
              </div>
            </label>
            {circuitFile && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-center gap-2">
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  ✓ Ready for upload ({Math.round(circuitFile.size / 1024)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCircuitFile(null);
                    setFileInputKey(Date.now());
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-bold underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ROW 4: Component References & Datasheets */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Component References &amp; Datasheets {!hasCircuitFile && <span className="text-red-500">*</span>}
            </label>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${hasComponentReferences ? 'bg-emerald-100 text-emerald-800' : hasCircuitFile ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
              {hasComponentReferences ? '✓ References provided' : hasCircuitFile ? 'Optional (Diagram attached)' : 'Required if no diagram uploaded *'}
            </span>
          </div>
          <input
            type="text"
            value={componentList}
            onChange={(e) => setComponentList(e.target.value)}
            placeholder="e.g. ESP32, 5V Relay, DHT22 sensor, USB Type-C connector, or links to parts"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          />
        </div>

        {/* ROW 5: Constraints of Board (Strictly Optional) */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Constraints of Board
            </label>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Strictly Optional (Leave blank if unsure)
            </span>
          </div>
          <input
            type="text"
            value={boardConstraints}
            onChange={(e) => setBoardConstraints(e.target.value)}
            placeholder="e.g. Max size 50mm x 50mm, 4x M3 corner mounting holes, must fit inside waterproof enclosure"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Strictly Optional: Mention any physical size limits or mounting requirements. If you don&apos;t have strict dimensions, our designer will choose the most cost-effective board size.
          </p>
        </div>

        {/* ROW 6: Special Instructions / Hardware Notes */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Special Instructions / Hardware Notes
            </label>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Optional
            </span>
          </div>
          <textarea
            rows={3}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="e.g. 12V DC input stepped down to 3.3V, wide tracks for motor current, keep antenna area clear..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          ></textarea>
        </div>

        {/* ROW 7: Expected Deadline */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Expected Deadline
            </label>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Target Timeline
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="date"
              value={expectedDeadline}
              onChange={(e) => setExpectedDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <button
                type="button"
                onClick={() => setDeadlinePreset(3)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(7)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(14)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                +2 Weeks
              </button>
              <button
                type="button"
                onClick={() => setExpectedDeadline('')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Flexible
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting Project Request...</span>
              </>
            ) : (
              <>
                <span>Submit PCB Design Request</span>
                <span>&rarr;</span>
              </>
            )}
          </button>
        </motion.div>
      </form>

      {/* Direct Contact */}
      <div className="mt-8 text-center text-xs text-slate-500">
        Direct designer contact:{' '}
        <a
          href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20Custom%20PCB%20Design%20Inquiry"
          className="text-blue-600 font-bold underline hover:text-blue-800"
        >
          ssquareelectronics2026@gmail.com
        </a>
      </div>

      {/* SLEEK SUCCESS CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSuccessModal && submittedData && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 sm:p-10 max-w-lg w-full shadow-2xl border border-slate-100 text-center relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Animated Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-3xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg shadow-emerald-500/30"
              >
                ✓
              </motion.div>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                Project Design Request Received!
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                Thank you, <strong>{submittedData.clientName}</strong>! Your project requirements have been forwarded directly to our lead designer, <strong>Santhosh</strong>.
              </p>

              {/* Project Recap Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-semibold">Project Name:</span>
                  <span className="font-bold text-slate-900">{submittedData.projectName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-semibold">Target Timeline:</span>
                  <span className="font-bold text-emerald-600">{submittedData.expectedDeadline}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-semibold">Circuit Diagram:</span>
                  <span className="font-bold text-slate-800">
                    {submittedData.fileName ? `Uploaded (${submittedData.fileName})` : 'None attached'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Confirmation Logged:</span>
                  <span className="font-bold text-blue-600">{submittedData.userEmail}</span>
                </div>
              </div>

              <p className="text-slate-500 text-xs mb-6">
                Santhosh will review your circuit diagram and contact you directly if any design adjustments or timeline extensions are needed.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20"
                >
                  Submit Another Project
                </button>
                <Link
                  href="/components"
                  className="flex-1 py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm transition-colors border border-slate-200 text-center"
                >
                  Browse Component Catalog &rarr;
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
