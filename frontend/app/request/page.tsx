'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

function sanitizeFileName(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.');
  let base = originalName;
  let ext = '';

  if (lastDot > 0) {
    base = originalName.slice(0, lastDot);
    ext = originalName.slice(lastDot);
  }

  // Replace spaces and special characters with underscores
  const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const cleanExt = ext.replace(/[^a-zA-Z0-9._-]/g, '');

  return `${Date.now()}_${cleanBase || 'file'}${cleanExt}`;
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
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let fileUrl: string | null = null;

      // 1. Sanitize file name and upload file if present
      if (file) {
        const fileName = sanitizeFileName(file.name);
        const { error: uploadError } = await supabase.storage
          .from('request_files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2. Retrieve the complete, exact public URL from Supabase
        const { data: publicUrlData } = supabase.storage
          .from('request_files')
          .getPublicUrl(fileName);

        fileUrl = publicUrlData.publicUrl;
      }

      // 3. Insert into database with user_email and status
      const { error: dbError } = await supabase
        .from('component_requests')
        .insert([
          {
            component_name: componentName,
            user_email: userEmail,
            description,
            file_url: fileUrl,
            status: 'Pending',
          },
        ]);

      if (dbError) throw dbError;

      // 4. Send Telegram Notification
      const telegramBotToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

      if (telegramBotToken && telegramChatId) {
        const safeName = escapeHtml(componentName);
        const safeEmail = escapeHtml(userEmail);
        const safeDesc = escapeHtml(description);

        const textMessage = fileUrl
          ? `🚀 <b>New Component Request!</b>\n\n` +
            `📌 <b>Name:</b> ${safeName}\n` +
            `📧 <b>Email:</b> ${safeEmail}\n` +
            `📝 <b>Details:</b> ${safeDesc}\n\n` +
            `📂 <b>Attachment:</b> <a href="${fileUrl.replace(/&/g, '&amp;')}">${escapeHtml(file?.name || 'Download / View Attachment')}</a>\n` +
            `🔗 <b>Direct Link:</b> ${fileUrl}`
          : `🚀 <b>New Component Request!</b>\n\n` +
            `📌 <b>Name:</b> ${safeName}\n` +
            `📧 <b>Email:</b> ${safeEmail}\n` +
            `📝 <b>Details:</b> ${safeDesc}\n\n` +
            `📂 <b>Attachment:</b> None`;

        let sent = false;

        // If an attachment is uploaded, try sending via Telegram's photo/document API for inline preview
        if (fileUrl && file) {
          const isPhoto = /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name) ||
                          (file.type.startsWith('image/') && !file.type.includes('svg'));
          const endpoint = isPhoto ? 'sendPhoto' : 'sendDocument';
          const mediaKey = isPhoto ? 'photo' : 'document';

          // Telegram captions are limited to 1024 characters
          if (textMessage.length <= 1024) {
            try {
              const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: telegramChatId,
                  [mediaKey]: fileUrl,
                  caption: textMessage,
                  parse_mode: 'HTML',
                }),
              });
              const resData = await res.json();
              if (resData.ok) {
                sent = true;
              } else {
                console.warn(`Telegram ${endpoint} returned non-ok response, falling back:`, resData);
              }
            } catch (mediaErr) {
              console.warn(`Telegram ${endpoint} error, falling back to sendMessage:`, mediaErr);
            }
          }
        }

        // Fallback or default: send standard sendMessage
        if (!sent) {
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: textMessage,
              parse_mode: 'HTML',
            }),
          }).catch((err) => console.error("Telegram notification failed:", err));
        }
      }

      setMessage('Request submitted successfully! We will email you once your component is ready.');
      setComponentName('');
      setUserEmail('');
      setDescription('');
      setFile(null);
      setFileInputKey(Date.now());
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setMessage(`Error submitting request: ${err.message}`);
      } else {
        setMessage('An unknown error occurred while submitting request.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-500 relative z-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-3 text-slate-900">Request a Component</h1>
        <p className="text-slate-500 font-medium text-lg">Can't find what you need? Send us a request and we'll design it.</p>
      </div>

      {message && (
        <div className={`p-5 rounded-2xl mb-8 font-bold shadow-sm border ${message.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-8">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Component Name / Part Number</label>
          <input type="text" value={componentName} onChange={e => setComponentName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="e.g. ATmega328P-AU" />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Your Email Address</label>
          <input 
            type="email" 
            value={userEmail} 
            onChange={e => setUserEmail(e.target.value)} 
            required 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" 
            placeholder="e.g. engineer@example.com" 
          />
          <p className="text-xs text-slate-400 mt-2 ml-1">We will notify you by email as soon as this component is created and uploaded!</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Details & Requirements</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Tell us about the specific package type, dimensions, or variations you need..."></textarea>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Attach Datasheet / Image (Optional)</label>
          <input key={fileInputKey} type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer transition-colors" />
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg tracking-wide rounded-xl shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-95">
          {loading ? 'Submitting Request...' : 'Send Request'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-500">
        <p>
          If you have any questions regarding your component request, you can directly email{' '}
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
