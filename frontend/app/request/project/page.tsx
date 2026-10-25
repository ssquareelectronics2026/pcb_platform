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

  return `${Date.now()}_${cleanBase || 'document'}${cleanExt}`;
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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
    fileNames: string[];
  } | null>(null);

  // Helper for quick deadline presets
  const setDeadlinePreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    setExpectedDeadline(target.toISOString().split('T')[0]);
  };

  // Handle file additions (avoiding duplicate names & sizes)
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles((prev) => {
        const existingSignatures = new Set(prev.map((f) => `${f.name}_${f.size}`));
        const uniqueNew = newFiles.filter((f) => !existingSignatures.has(`${f.name}_${f.size}`));
        return [...prev, ...uniqueNew];
      });
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setFileInputKey(Date.now());
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
    const hasFiles = uploadedFiles.length > 0;
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

    // Circuit Diagram / Datasheet / Component References is strictly Mandatory
    if (!hasFiles && !hasComponentReferences) {
      setErrorMessage(
        'Please provide either Circuit Diagram / Datasheet file uploads OR your Component References & Links so our engineering team can design your board.'
      );
      setLoading(false);
      return;
    }

    try {
      // 1. Sanitize & Upload all attached Circuit Diagrams & Datasheets to Supabase Storage
      const uploadedFilesData: Array<{ name: string; url: string; size: number }> = [];

      for (const file of uploadedFiles) {
        const sanitizedName = sanitizeFileName(file.name);
        const { error: uploadError } = await supabase.storage
          .from('request_files')
          .upload(sanitizedName, file);

        if (uploadError) {
          console.warn(`File upload warning for ${file.name}:`, uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('request_files')
            .getPublicUrl(sanitizedName);
          uploadedFilesData.push({
            name: file.name,
            url: publicUrlData.publicUrl,
            size: file.size,
          });
        }
      }

      const primaryFileUrl = uploadedFilesData[0]?.url || null;
      const primaryFileName = uploadedFilesData[0]?.name || '';

      // 2. Structured Description with full attached files breakdown
      const filesSummary =
        uploadedFilesData.length > 0
          ? `Attached Documentation & Datasheets (${uploadedFilesData.length}):\n` +
            uploadedFilesData.map((f, i) => `  ${i + 1}. ${f.name} -> ${f.url}`).join('\n')
          : 'Attached Files: None';

      const structuredDescription = [
        `Client / Company: ${trimmedClient}`,
        `Target Deadline: ${expectedDeadline || 'Flexible'}`,
        `Board Constraints: ${boardConstraints.trim() || 'No specific restrictions'}`,
        `Component References: ${componentList.trim() || 'None specified'}`,
        `Special Instructions: ${specialInstructions.trim() || 'None'}`,
        '',
        filesSummary,
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
            file_url: primaryFileUrl,
            status: 'Pending',
          },
        ]);

      if (dbError) {
        console.warn('Database note:', dbError);
      }

      // 4. Dispatch Email to S SQUARE ELECTRONICS & Client via API route
      try {
        await fetch('/api/submit-pcb-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: trimmedProject,
            clientName: trimmedClient,
            userEmail: trimmedEmail,
            fileUrl: primaryFileUrl,
            fileName: primaryFileName,
            files: uploadedFilesData,
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
        const filesTelegramList =
          uploadedFilesData.length > 0
            ? uploadedFilesData
                .map((f) => `• <a href="${f.url}">${escapeHtml(f.name)}</a>`)
                .join('\n')
            : 'None attached';

        const textMessage =
          `⚡ <b>New Custom PCB Project Design Request!</b>\n\n` +
          `📌 <b>Project:</b> ${escapeHtml(trimmedProject)}\n` +
          `👤 <b>Client:</b> ${escapeHtml(trimmedClient)}\n` +
          `📧 <b>Email:</b> ${escapeHtml(trimmedEmail)}\n` +
          `📅 <b>Deadline:</b> ${escapeHtml(expectedDeadline || 'Flexible')}\n` +
          `📐 <b>Constraints:</b> ${escapeHtml(boardConstraints.trim() || 'None')}\n` +
          `🧩 <b>Components:</b> ${escapeHtml(componentList.trim() || 'None')}\n` +
          `📝 <b>Notes:</b> ${escapeHtml(specialInstructions.trim() || 'None')}\n\n` +
          `📂 <b>Circuit Diagrams & Datasheets:</b>\n${filesTelegramList}`;

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
        fileNames: uploadedFilesData.map((f) => f.name),
      });

      setShowSuccessModal(true);

      // Reset form
      setProjectName('');
      setClientName('');
      setUserEmail('');
      setUploadedFiles([]);
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

  const hasFiles = uploadedFiles.length > 0;
  const hasComponentReferences = Boolean(componentList.trim());

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 relative z-10">
      
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider shadow-sm">
          <span>⚡ S SQUARE ELECTRONICS</span>
          <span className="text-slate-300">•</span>
          <span>Custom Hardware Engineering</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Request Project Design
        </h1>

        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Need a complete PCB board designed for your hardware idea or circuit? Share your requirements and our engineering team at <strong>S SQUARE ELECTRONICS</strong> will design, route, and deliver a production-ready PCB.
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
          <strong>Mandatory Information:</strong> Project Name, Client / Company Name, Email Address, and at least one technical reference (either <strong>Circuit Diagram &amp; Datasheet uploads</strong> <em>or</em> <strong>Component References / Links</strong>) are required. <strong>Constraints of Board</strong> is strictly optional!
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
            Our engineering team will send project progress, timeline updates, and completed PCB design files directly here.
          </p>
        </div>

        {/* ROW 3: Circuit Diagram & Component Datasheets Upload */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Upload Circuit Diagram &amp; Component Datasheets (.pdf, .png, .jpg, .jpeg) {!hasComponentReferences && <span className="text-red-500">*</span>}
            </label>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full self-start sm:self-auto ${hasFiles ? 'bg-emerald-100 text-emerald-800' : hasComponentReferences ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
              {hasFiles ? `✓ ${uploadedFiles.length} file(s) attached` : hasComponentReferences ? 'Optional (References provided)' : 'Required if no references *'}
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">
            Attach your circuit diagram or schematic sketch, plus any component pinout sheets, reference PDFs, or sensor datasheets (.pdf, .png, .jpg, .jpeg). You can attach multiple files.
          </p>

          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <input
              key={fileInputKey}
              type="file"
              multiple
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileSelection}
              id="circuit-file-input"
              className="hidden"
            />
            <label htmlFor="circuit-file-input" className="cursor-pointer block space-y-2">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-xl shadow-inner">
                📂
              </div>
              <div>
                <span className="text-sm font-bold text-blue-600 hover:text-blue-700 underline">
                  Click or drag to attach Circuit Diagrams, Datasheets, or Technical PDFs
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Supports multiple files (.pdf, .png, .jpg, .jpeg) &bull; Schematics, IC datasheets, connector pinouts, dimension notes
                </p>
              </div>
            </label>
          </div>

          {/* Attached Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <span>Attached Documentation ({uploadedFiles.length}):</span>
                <label htmlFor="circuit-file-input" className="text-blue-600 hover:underline cursor-pointer">
                  + Add more files
                </label>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {uploadedFiles.map((file, idx) => {
                  const isPdf = file.name.toLowerCase().endsWith('.pdf');
                  const sizeKb = Math.round(file.size / 1024);
                  const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

                  return (
                    <div
                      key={`${file.name}_${idx}`}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs shadow-sm hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <span className="text-lg flex-shrink-0">{isPdf ? '📄' : '🖼️'}</span>
                        <span className="font-bold text-slate-800 truncate">{file.name}</span>
                        <span className="text-[11px] text-slate-400 font-semibold flex-shrink-0">({sizeStr})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ROW 4: Component References & Links */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Component List / Reference Links {!hasFiles && <span className="text-red-500">*</span>}
            </label>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${hasComponentReferences ? 'bg-emerald-100 text-emerald-800' : hasFiles ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
              {hasComponentReferences ? '✓ References provided' : hasFiles ? 'Optional (Files attached above)' : 'Required if no files uploaded *'}
            </span>
          </div>
          <input
            type="text"
            value={componentList}
            onChange={(e) => setComponentList(e.target.value)}
            placeholder="e.g. ESP32-WROOM-32, 5V Relay Module, DHT22 sensor, USB-C, or links to online datasheets"
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
            Strictly Optional: Mention any physical size limits or mounting requirements. If you don&apos;t have strict dimensions, our engineering team will choose the most cost-effective board size.
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm flex-1"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDeadlinePreset(3)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(7)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(14)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                +2 Weeks
              </button>
              {expectedDeadline && (
                <button
                  type="button"
                  onClick={() => setExpectedDeadline('')}
                  className="px-2 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  title="Clear deadline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Let us know when you need the Gerber files or board prototypes completed.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black py-4 px-8 rounded-2xl transition-all duration-300 shadow-xl shadow-blue-600/25 disabled:opacity-50 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading Files &amp; Submitting Request...</span>
              </>
            ) : (
              <span>Submit Project Design Request 🚀</span>
            )}
          </button>
        </div>

      </form>

      {/* Sleek Success Confirmation Modal */}
      <AnimatePresence>
        {showSuccessModal && submittedData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center relative"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-3xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg shadow-emerald-500/30"
              >
                ✓
              </motion.div>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                Project Design Request Received!
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                Thank you, <strong>{submittedData.clientName}</strong>! Your project requirements and documentation have been forwarded directly to the <strong>S SQUARE ELECTRONICS</strong> engineering team.
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
                  <span className="text-slate-500 font-semibold">Attached Documentation:</span>
                  <span className="font-bold text-slate-800">
                    {submittedData.fileNames.length > 0
                      ? `${submittedData.fileNames.length} file(s) (${submittedData.fileNames.join(', ')})`
                      : 'None attached'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Confirmation Logged:</span>
                  <span className="font-bold text-blue-600">{submittedData.userEmail}</span>
                </div>
              </div>

              <p className="text-slate-500 text-xs mb-6">
                Our engineering team will review your circuit diagrams and component datasheets, and contact you directly if any design adjustments or timeline extensions are needed.
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
