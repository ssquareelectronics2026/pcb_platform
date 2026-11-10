'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';

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
        'Please provide either Circuit Diagram / Datasheet file uploads or your Component References & Links so our engineering team can design your board.'
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
      const { error: dbError } = await supabase.from('component_requests').insert([
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
          `<b>New Custom PCB Project Design Request</b>\n\n` +
          `<b>Project:</b> ${escapeHtml(trimmedProject)}\n` +
          `<b>Client:</b> ${escapeHtml(trimmedClient)}\n` +
          `<b>Email:</b> ${escapeHtml(trimmedEmail)}\n` +
          `<b>Deadline:</b> ${escapeHtml(expectedDeadline || 'Flexible')}\n` +
          `<b>Constraints:</b> ${escapeHtml(boardConstraints.trim() || 'None')}\n` +
          `<b>Components:</b> ${escapeHtml(componentList.trim() || 'None')}\n` +
          `<b>Notes:</b> ${escapeHtml(specialInstructions.trim() || 'None')}\n\n` +
          `<b>Circuit Diagrams & Datasheets:</b>\n${filesTelegramList}`;

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

      // 6. Open success confirmation modal
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
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while submitting.'
      );
    } finally {
      setLoading(false);
    }
  };

  const hasFiles = uploadedFiles.length > 0;
  const hasComponentReferences = Boolean(componentList.trim());

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="space-y-3 border-b border-[#161513]/10 pb-6">
        <p className="font-mono text-xs text-[#9a6320]">
          S SQUARE ELECTRONICS · Custom engineering
        </p>

        <h1 className="text-3xl sm:text-4xl font-medium text-[#161513] tracking-[-0.02em]">
          Request project design
        </h1>

        <p className="text-[#52504a] text-sm sm:text-base max-w-2xl leading-relaxed font-normal">
          Share your schematic diagram, component references, and board requirements. Our engineering team at{' '}
          <span className="font-medium text-[#161513]">S SQUARE ELECTRONICS</span> will route and deliver production-ready PCB and Gerber files.
        </p>

        <div className="pt-1">
          <Link
            href="/request/component"
            className="text-sm font-medium text-[#9a6320] hover:text-[#7a4c14] inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop"
          >
            <span>Only need a single symbol or footprint? Request component</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      {/* Helper Banner for Mandatory & Optional Fields */}
      <div className="bg-white border border-[#161513]/10 rounded-xl p-4 text-xs sm:text-sm text-[#52504a] flex items-start gap-3">
        <Info className="w-[18px] h-[18px] text-[#9a6320] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
        <div className="leading-relaxed">
          <span className="font-medium text-[#161513]">Mandatory information: </span>
          Project Name, Client / Company Name, Email Address, and at least one technical reference (either{' '}
          <span className="font-medium text-[#161513]">Circuit Diagram &amp; Datasheet uploads</span>{' '}
          or{' '}
          <span className="font-medium text-[#161513]">Component References / Links</span>) are required. Constraints of Board is optional.
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#dc2626]/[0.06] border border-[#dc2626]/20 text-[#991b1b] text-sm flex items-start gap-3">
          <AlertCircle className="w-[18px] h-[18px] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#161513]/10 p-6 sm:p-8 rounded-2xl space-y-6"
      >
        {/* ROW 1: Project Name & Client/Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#161513]">
              Project name <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Smart Irrigation Controller, IoT Node"
              className="w-full h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#161513]">
              Client / company name <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Alex Johnson or Apex Robotics"
              className="w-full h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
            />
          </div>
        </div>

        {/* ROW 2: Email Address */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#161513]">
            Email address <span className="text-[#dc2626]">*</span>
          </label>
          <input
            type="email"
            required
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="client@example.com"
            className="w-full h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
          />
          <p className="text-xs text-[#76736c]">
            Project updates and finished PCB Gerber archives are delivered to this email.
          </p>
        </div>

        {/* ROW 3: Circuit Diagram & Component Datasheets Upload */}
        <div className="pt-4 border-t border-[#161513]/8 space-y-2.5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
            <label className="block text-sm font-medium text-[#161513]">
              Upload Circuit Diagram &amp; Component Datasheets (.pdf, .png, .jpg, .jpeg){' '}
              {!hasComponentReferences && <span className="text-[#dc2626]">*</span>}
            </label>
            <span
              className={`font-mono text-xs tabular-nums ${
                hasFiles
                  ? 'text-[#167c4c]'
                  : hasComponentReferences
                    ? 'text-[#76736c]'
                    : 'text-[#9a6320]'
              }`}
            >
              {hasFiles
                ? `${uploadedFiles.length} attached`
                : hasComponentReferences
                  ? 'Optional (references listed)'
                  : 'Required without references'}
            </span>
          </div>

          <p className="text-xs text-[#52504a] leading-relaxed">
            Upload Circuit Diagram &amp; Component Datasheets (.pdf, .png, .jpg, .jpeg) such as circuit sketches, pinout tables, or sensor PDFs. Multiple files supported.
          </p>

          <div className="border border-dashed border-[#161513]/20 hover:border-[#9a6320] rounded-xl p-6 text-center bg-[#f6f5f1] transition-colors duration-150 ease-unslop">
            <input
              key={fileInputKey}
              type="file"
              multiple
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileSelection}
              id="circuit-file-input"
              className="hidden"
            />
            <label htmlFor="circuit-file-input" className="cursor-pointer block space-y-2.5">
              <div className="w-10 h-10 bg-white border border-[#161513]/10 text-[#161513] rounded-lg flex items-center justify-center mx-auto">
                <Upload className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-[#9a6320] hover:text-[#7a4c14] underline underline-offset-2">
                  Select Circuit Diagrams, Datasheets, or Technical PDFs
                </span>
                <p className="font-mono text-[11px] text-[#76736c]">
                  .pdf, .png, .jpg, .jpeg — schematics, IC datasheets, connector pinouts
                </p>
              </div>
            </label>
          </div>

          {/* Attached Files List */}
          {uploadedFiles.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#52504a] px-0.5">
                <span className="font-mono tabular-nums">
                  Attached files ({uploadedFiles.length})
                </span>
                <label
                  htmlFor="circuit-file-input"
                  className="text-[#9a6320] hover:text-[#7a4c14] font-medium cursor-pointer"
                >
                  + Add more files
                </label>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {uploadedFiles.map((file, idx) => {
                  const isPdf = file.name.toLowerCase().endsWith('.pdf');
                  const sizeKb = Math.round(file.size / 1024);
                  const sizeStr =
                    sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

                  return (
                    <div
                      key={`${file.name}_${idx}`}
                      className="flex items-center justify-between h-11 px-3 bg-[#f6f5f1] border border-[#161513]/10 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        {isPdf ? (
                          <FileText
                            className="w-4 h-4 text-[#9a6320] flex-shrink-0"
                            strokeWidth={1.5}
                          />
                        ) : (
                          <ImageIcon
                            className="w-4 h-4 text-[#52504a] flex-shrink-0"
                            strokeWidth={1.5}
                          />
                        )}
                        <span className="font-mono font-medium text-[#161513] truncate">
                          {file.name}
                        </span>
                        <span className="font-mono tabular-nums text-[11px] text-[#76736c] flex-shrink-0">
                          {sizeStr}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-[#76736c] hover:text-[#dc2626] p-1.5 rounded-md hover:bg-white transition-colors duration-150 ease-unslop flex-shrink-0 inline-flex items-center gap-1"
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span className="text-xs font-medium">Remove</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ROW 4: Component References & Links */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <label className="block text-sm font-medium text-[#161513]">
              Component list / reference links {!hasFiles && <span className="text-[#dc2626]">*</span>}
            </label>
            <span
              className={`font-mono text-xs ${
                hasComponentReferences
                  ? 'text-[#167c4c]'
                  : hasFiles
                    ? 'text-[#76736c]'
                    : 'text-[#9a6320]'
              }`}
            >
              {hasComponentReferences
                ? 'References provided'
                : hasFiles
                  ? 'Optional (files attached)'
                  : 'Required without files'}
            </span>
          </div>
          <input
            type="text"
            value={componentList}
            onChange={(e) => setComponentList(e.target.value)}
            placeholder="ESP32-WROOM-32, 5V Relay, DHT22, USB-C receptacle, or URLs"
            className="w-full h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] font-mono text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
          />
        </div>

        {/* ROW 5: Constraints of Board (Strictly Optional) */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <label className="block text-sm font-medium text-[#161513]">
              Constraints of board
            </label>
            <span className="font-mono text-xs text-[#76736c]">Optional</span>
          </div>
          <input
            type="text"
            value={boardConstraints}
            onChange={(e) => setBoardConstraints(e.target.value)}
            placeholder="Max 50mm x 50mm outline, 4x M3 corner mounting holes"
            className="w-full h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
          />
          <p className="text-xs text-[#76736c]">
            Leave blank if you have no strict mechanical bounds; we will optimize for cost and layout clearances.
          </p>
        </div>

        {/* ROW 6: Special Instructions / Hardware Notes */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-2">
            <label className="block text-sm font-medium text-[#161513]">
              Special instructions / hardware notes
            </label>
            <span className="font-mono text-xs text-[#76736c]">Optional</span>
          </div>
          <textarea
            rows={3}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="12V DC buck to 3.3V, wider copper traces for motor current, antenna keep-out zone"
            className="w-full bg-[#f6f5f1] border border-[#161513]/12 rounded-lg p-4 text-[#161513] text-sm placeholder-[#76736c] focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop"
          />
        </div>

        {/* ROW 7: Expected Deadline */}
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-2">
            <label className="block text-sm font-medium text-[#161513]">
              Expected deadline
            </label>
            <span className="font-mono text-xs text-[#76736c]">Target timeline</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="date"
              value={expectedDeadline}
              onChange={(e) => setExpectedDeadline(e.target.value)}
              className="h-11 bg-[#f6f5f1] border border-[#161513]/12 rounded-lg px-4 text-[#161513] font-mono text-sm tabular-nums focus:outline-none focus:border-[#9a6320] focus:bg-white transition-colors duration-150 ease-unslop flex-1"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDeadlinePreset(3)}
                className="h-9 px-3 bg-[#eeede8] hover:bg-[#e4e2dc] text-[#161513] border border-[#161513]/8 rounded-lg font-mono text-xs transition-colors duration-150 ease-unslop"
              >
                +3 days
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(7)}
                className="h-9 px-3 bg-[#eeede8] hover:bg-[#e4e2dc] text-[#161513] border border-[#161513]/8 rounded-lg font-mono text-xs transition-colors duration-150 ease-unslop"
              >
                +1 week
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(14)}
                className="h-9 px-3 bg-[#eeede8] hover:bg-[#e4e2dc] text-[#161513] border border-[#161513]/8 rounded-lg font-mono text-xs transition-colors duration-150 ease-unslop"
              >
                +2 weeks
              </button>
              {expectedDeadline && (
                <button
                  type="button"
                  onClick={() => setExpectedDeadline('')}
                  className="h-9 px-2.5 text-[#76736c] hover:text-[#161513] font-mono text-xs transition-colors duration-150 ease-unslop"
                  title="Clear deadline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-[#76736c]">
            Target delivery date for your schematic and fabrication Gerber package.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 px-5 bg-[#161513] hover:bg-[#2a2824] text-white font-medium rounded-lg transition-colors duration-150 ease-unslop disabled:opacity-50 text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                <span>Uploading documentation &amp; submitting</span>
              </>
            ) : (
              <>
                <span>Submit project design request</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Confirmation Modal */}
      <AnimatePresence>
        {showSuccessModal && submittedData && (
          <div className="fixed inset-0 bg-[#161513]/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-[0_12px_32px_rgba(22,21,19,0.14)] border border-[#161513]/12 space-y-5"
            >
              <div className="w-10 h-10 bg-[#167c4c]/10 border border-[#167c4c]/20 text-[#167c4c] rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-medium text-[#161513] tracking-tight">
                  Project design request received
                </h3>
                <p className="text-[#52504a] text-sm leading-relaxed">
                  Thank you, <span className="font-medium text-[#161513]">{submittedData.clientName}</span>. Your schematics and documentation have been dispatched to the{' '}
                  <span className="font-medium text-[#161513]">S SQUARE ELECTRONICS</span> engineering team.
                </p>
              </div>

              {/* Recap Table */}
              <div className="bg-[#f6f5f1] border border-[#161513]/10 rounded-xl divide-y divide-[#161513]/8 px-4 text-xs">
                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-[#76736c]">Project name</span>
                  <span className="font-medium text-[#161513] text-right">
                    {submittedData.projectName}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-[#76736c]">Target timeline</span>
                  <span className="font-mono tabular-nums text-[#167c4c] font-medium">
                    {submittedData.expectedDeadline}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-[#76736c]">Attached files</span>
                  <span className="font-mono tabular-nums text-[#161513] text-right truncate max-w-[240px]">
                    {submittedData.fileNames.length > 0
                      ? `${submittedData.fileNames.length} (${submittedData.fileNames.join(', ')})`
                      : 'None'}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-[#76736c]">Confirmation email</span>
                  <span className="font-mono text-[#9a6320]">{submittedData.userEmail}</span>
                </div>
              </div>

              <p className="text-[#76736c] text-xs leading-relaxed">
                Our team will review your files and contact you directly if clarification or timeline adjustments are needed.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 h-10 px-4 bg-[#161513] hover:bg-[#2a2824] text-white font-medium rounded-lg text-sm transition-colors duration-150 ease-unslop"
                >
                  Submit another project
                </button>
                <Link
                  href="/components"
                  className="flex-1 h-10 px-4 bg-[#eeede8] hover:bg-[#e4e2dc] text-[#161513] border border-[#161513]/10 font-medium rounded-lg text-sm transition-colors duration-150 ease-unslop inline-flex items-center justify-center gap-1.5"
                >
                  <span>Browse catalog</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
