'use client';
import { useState, useEffect } from 'react';
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

interface RequestItem {
  id: string | number;
  component_name: string;
  user_email: string;
  component_link?: string | null;
  description: string;
  file_url?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export default function RequestComponentPage() {
  // Navigation / View state
  const [activeTab, setActiveTab] = useState<'client-form' | 'designer-portal'>('client-form');

  // Client Request Form State
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [circuitFile, setCircuitFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [componentList, setComponentList] = useState('');
  const [boardConstraints, setBoardConstraints] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [expectedDeadline, setExpectedDeadline] = useState('');

  // Submission & Confirmation state
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

  // Designer Portal State
  const [incomingRequests, setIncomingRequests] = useState<RequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [designerActionMessage, setDesignerActionMessage] = useState('');
  
  // Extension Modal State
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [proposedNewDate, setProposedNewDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('Multi-layer routing optimization & design-for-manufacturing (DFM) verification.');
  const [customDesignerMessage, setCustomDesignerMessage] = useState('');
  const [extendingLoading, setExtendingLoading] = useState(false);

  // Fetch incoming requests when Designer Portal is activated
  useEffect(() => {
    if (activeTab === 'designer-portal') {
      fetchRequests();
    }
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from('component_requests')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setIncomingRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch incoming requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Helper for quick deadline presets
  const setDeadlinePreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    setExpectedDeadline(target.toISOString().split('T')[0]);
  };

  // Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const trimmedProject = projectName.trim();
    const trimmedClient = clientName.trim();
    const trimmedEmail = userEmail.trim();

    if (!trimmedProject) {
      setErrorMessage('Please enter the Project Name.');
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
          console.warn('File upload warning:', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('request_files')
            .getPublicUrl(uploadedFileName);
          fileUrl = publicUrlData.publicUrl;
        }
      }

      // 2. Format a comprehensive description for designer Santhosh
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
            component_name: `[PCB Design] ${trimmedProject}`,
            user_email: trimmedEmail,
            component_link: componentList.trim() || null,
            description: structuredDescription,
            file_url: fileUrl,
            status: 'Pending',
          },
        ]);

      if (dbError) {
        console.warn('Database insert note:', dbError);
      }

      // 4. Send live/simulated Email via API route directly to Santhosh & client confirmation
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
      } catch (emailApiErr) {
        console.warn('Email dispatch API note:', emailApiErr);
      }

      // 5. Telegram Notification if configured
      const telegramBotToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

      if (telegramBotToken && telegramChatId) {
        const textMessage = `⚡ <b>New Custom PCB Design Request!</b>\n\n` +
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

      // 6. Record submitted details and show sleek success confirmation modal
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

  // Open Extension Modal
  const handleOpenExtensionModal = (req: RequestItem) => {
    setSelectedRequest(req);
    // Set default extension to +5 days
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 5);
    setProposedNewDate(nextDate.toISOString().split('T')[0]);
    setExtensionReason('Multi-layer routing optimization & design-for-manufacturing (DFM) verification.');
    setCustomDesignerMessage('');
    setExtensionModalOpen(true);
  };

  // Submit Date Extension / Client Reply
  const handleSendExtension = async () => {
    if (!selectedRequest || !proposedNewDate) return;
    setExtendingLoading(true);

    try {
      const res = await fetch('/api/extend-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          clientEmail: selectedRequest.user_email,
          clientName: 'Valued Client',
          projectName: selectedRequest.component_name.replace('[PCB Design] ', ''),
          proposedDate: proposedNewDate,
          reason: extensionReason,
          customMessage: customDesignerMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch extension email');

      setDesignerActionMessage(`✓ Timeline adjustment email sent to ${selectedRequest.user_email} by Santhosh!`);
      setExtensionModalOpen(false);
      fetchRequests(); // Refresh request list

      setTimeout(() => setDesignerActionMessage(''), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to send timeline update');
    } finally {
      setExtendingLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 relative z-10">
      
      {/* Top Header & Portal Switcher */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider shadow-sm">
          <span>⚡ S SQUARE ELECTRONICS</span>
          <span className="text-slate-300">•</span>
          <span>Lead Designer: Santhosh</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Custom PCB Design Request
        </h1>

        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Have a circuit idea or hardware project? Share your requirements and our lead designer <strong>Santhosh</strong> will convert your circuit into a production-ready PCB layout.
        </p>

        {/* View Toggle Tabs */}
        <div className="pt-2 flex justify-center">
          <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('client-form')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'client-form'
                  ? 'bg-white text-blue-600 shadow-md shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📝 Client Request Form
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('designer-portal')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'designer-portal'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👨‍💻 Designer Portal</span>
              <span className="text-[11px] bg-blue-500/30 px-2 py-0.5 rounded-full">Santhosh</span>
            </button>
          </div>
        </div>
      </div>

      {/* DESIGNER ACTION NOTIFICATION TOAST */}
      {designerActionMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between shadow-sm"
        >
          <span>{designerActionMessage}</span>
          <button onClick={() => setDesignerActionMessage('')} className="text-emerald-600 hover:text-emerald-900 ml-4 font-bold">✕</button>
        </motion.div>
      )}

      {/* ERROR MESSAGE BANNER */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
          {errorMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CLIENT REQUEST FORM (SIMPLIFIED FOR NON-ENGINEERS)                 */}
      {/* ========================================================================= */}
      {activeTab === 'client-form' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-slate-200 rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-slate-200/50 space-y-8"
        >
          {/* Quick Helper Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 text-sm text-slate-700 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <p className="leading-relaxed text-xs sm:text-sm font-medium">
              <strong>Non-Engineers Welcome!</strong> You don&apos;t need complex technical jargon. Simply upload your <strong>Circuit Diagram</strong> (hand-drawn sketch, photo, or PDF) and describe what you want the device to do.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
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
                  placeholder="e.g. Smart Irrigation System, IoT Temperature Node"
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
                placeholder="e.g. yourname@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Designer Santhosh will email your quotation, timeline updates, and completed PCB files directly here.
              </p>
            </div>

            {/* ROW 3: Circuit Diagram Upload */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Circuit Diagram Upload
                </label>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  Optional / Recommended
                </span>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <input
                  key={fileInputKey}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => setCircuitFile(e.target.files?.[0] || null)}
                  id="circuit-file"
                  className="hidden"
                />
                <label htmlFor="circuit-file" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-xl shadow-inner">
                    📁
                  </div>
                  <div>
                    <span className="text-sm font-bold text-blue-600 hover:text-blue-700 underline">
                      {circuitFile ? circuitFile.name : 'Click to select Circuit Diagram'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload a hand-drawn sketch, wiring diagram, block diagram, or PDF (.pdf, .png, .jpg, .jpeg)
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

            {/* ROW 4: Component List / References */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Component List / References
                </label>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Optional
                </span>
              </div>
              <input
                type="text"
                value={componentList}
                onChange={(e) => setComponentList(e.target.value)}
                placeholder="e.g. ESP32, Relay 5V, DHT22 sensor, USB Type-C connector, or links to parts"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              />
            </div>

            {/* ROW 5: Constraints of Board */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Constraints of Board
                </label>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Optional (Leave blank if unsure)
                </span>
              </div>
              <input
                type="text"
                value={boardConstraints}
                onChange={(e) => setBoardConstraints(e.target.value)}
                placeholder="e.g. Max size 50mm x 50mm, 4x M3 corner mounting holes, must fit inside waterproof box"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Have size restrictions or mounting hole requirements? Mention them here. If not, our designer will choose the most cost-effective size.
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

            {/* ROW 7: Expected Deadline (Date Picker & Presets) */}
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
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Forwarding Request to Santhosh...</span>
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

          {/* Contact Direct Notice */}
          <div className="text-center pt-2 text-xs text-slate-500">
            Direct designer contact:{' '}
            <a
              href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20Custom%20PCB%20Design%20Inquiry"
              className="text-blue-600 font-bold underline hover:text-blue-800"
            >
              ssquareelectronics2026@gmail.com
            </a>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DESIGNER PORTAL / ACTION SIMULATION (SANTHOSH VIEW)                */}
      {/* ========================================================================= */}
      {activeTab === 'designer-portal' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Designer Header Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs uppercase font-extrabold tracking-widest text-blue-400">
                  Designer Workspace
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">Santhosh&apos;s Review &amp; Dispatch Console</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Review incoming client PCB design requests, inspect circuit diagrams, and dispatch timeline adjustment notices.
              </p>
            </div>
            <button
              onClick={fetchRequests}
              disabled={loadingRequests}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              {loadingRequests ? 'Refreshing...' : '🔄 Refresh Requests'}
            </button>
          </div>

          {/* Requests List */}
          {loadingRequests ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm font-bold text-slate-500">Loading incoming requests...</p>
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <span className="text-4xl block mb-2">📭</span>
              <h3 className="text-lg font-bold text-slate-800">No requests yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                When clients submit a custom PCB design request, it will appear here for review and timeline communication.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((req) => {
                const isExtension = req.status === 'Extension Requested';
                const isCompleted = req.status === 'Completed';

                return (
                  <div
                    key={req.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            #{req.id}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isExtension
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {req.status || 'Pending'}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                          {req.component_name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Client Email:{' '}
                          <a href={`mailto:${req.user_email}`} className="text-blue-600 font-bold hover:underline">
                            {req.user_email}
                          </a>
                        </p>
                      </div>

                      {/* Interactive Designer Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenExtensionModal(req)}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>📅 Request Date Extension / Reply</span>
                        </button>
                        
                        <a
                          href={`mailto:${req.user_email}?subject=Regarding%20Your%20PCB%20Design%20Request%20(${encodeURIComponent(req.component_name)})`}
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                        >
                          ✉️ Email Client
                        </a>
                      </div>
                    </div>

                    {/* Request Details Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
                      <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="font-extrabold uppercase tracking-wider text-slate-500 block">
                          Project Specs &amp; Notes
                        </span>
                        <p className="text-slate-800 whitespace-pre-line font-medium leading-relaxed">
                          {req.description}
                        </p>
                      </div>

                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                            Circuit Diagram Attachment
                          </span>
                          {req.file_url ? (
                            <a
                              href={req.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
                            >
                              <span>📥 View / Download Circuit Diagram</span>
                              <span>↗</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No circuit diagram file attached</span>
                          )}
                        </div>

                        {req.component_link && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <span className="font-extrabold uppercase tracking-wider text-slate-500 block text-[10px]">
                              Component List / References:
                            </span>
                            <span className="text-slate-700 font-medium break-all">
                              {req.component_link}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE DATE EXTENSION / CLIENT REPLY MODAL                           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {extensionModalOpen && selectedRequest && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setExtensionModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setExtensionModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-2"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl font-bold border border-amber-100 shadow-sm">
                  📅
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Request Date Extension</h3>
                  <p className="text-xs text-slate-500">Dispatch an automated timeline notice to the client.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Project:</span>
                    <span className="font-bold text-slate-900">{selectedRequest.component_name}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500 font-semibold">Client Email:</span>
                    <span className="font-bold text-blue-600">{selectedRequest.user_email}</span>
                  </div>
                </div>

                {/* Proposed New Date */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                    Proposed New Completion Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={proposedNewDate}
                    onChange={(e) => setProposedNewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Quick Reasons */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                    Reason for Extension
                  </label>
                  <div className="space-y-1.5">
                    {[
                      'Multi-layer routing optimization & design-for-manufacturing (DFM) verification.',
                      'High-current thermal relief and impedance matching on critical lines.',
                      'Awaiting footprint verification with component manufacturer datasheet.',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setExtensionReason(reason)}
                        className={`w-full text-left p-2 rounded-lg text-[11px] font-medium border transition-colors ${
                          extensionReason === reason
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        • {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Designer Message */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                    Additional Note from Santhosh (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customDesignerMessage}
                    onChange={(e) => setCustomDesignerMessage(e.target.value)}
                    placeholder="e.g. We have laid out 70% of the traces and will send an intermediate 3D preview shortly..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  ></textarea>
                </div>

                {/* Dispatch Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={extendingLoading || !proposedNewDate}
                    onClick={handleSendExtension}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {extendingLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Dispatching Email...</span>
                      </>
                    ) : (
                      <>
                        <span>✉️ Send Timeline Update to Client</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SLEEK SUCCESS CONFIRMATION MODAL                                          */}
      {/* ========================================================================= */}
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
                Request Forwarded to Santhosh!
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                Thank you, <strong>{submittedData.clientName}</strong>! Your project details have been successfully received and assigned to our lead designer, <strong>Santhosh</strong>.
              </p>

              {/* Project Recap Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-semibold">Project Name:</span>
                  <span className="font-bold text-slate-900">{submittedData.projectName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-semibold">Target Deadline:</span>
                  <span className="font-bold text-emerald-600">{submittedData.expectedDeadline}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-semibold">Circuit Diagram:</span>
                  <span className="font-bold text-slate-800">
                    {submittedData.fileName ? `Uploaded (${submittedData.fileName})` : 'None attached'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Confirmation Sent:</span>
                  <span className="font-bold text-blue-600">{submittedData.userEmail}</span>
                </div>
              </div>

              {/* Next Steps */}
              <p className="text-slate-500 text-xs mb-6">
                Santhosh will review your circuit diagram and contact you if any design adjustments or date extensions are proposed.
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
