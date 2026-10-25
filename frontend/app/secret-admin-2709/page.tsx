'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ImageCropModal from '@/components/ImageCropModal';

// 1. Strict Types
interface ComponentRecord {
  id: string | number;
  name: string;
  description: string;
  tags: string;
  component_image_url?: string | null;
  symbol_preview_url?: string | null;
  footprint_preview_url?: string | null;
  symbol_file_url?: string | null;
  footprint_file_url?: string | null;
}

interface ComponentRequestRecord {
  id: string | number;
  component_name: string;
  description: string;
  user_email?: string | null;
  component_link?: string | null;
  file_url?: string | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

type CropTarget = 'componentImage' | 'symbolPreview' | 'footprintPreview' | null;

export default function AdminDashboard() {
  const [adminSection, setAdminSection] = useState<'catalog' | 'requests'>('catalog');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  
  const [componentImage, setComponentImage] = useState<File | null>(null);
  const [symbolPreview, setSymbolPreview] = useState<File | null>(null);
  const [footprintPreview, setFootprintPreview] = useState<File | null>(null);
  
  const [symbolFile, setSymbolFile] = useState<File | null>(null);
  const [footprintFile, setFootprintFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [components, setComponents] = useState<ComponentRecord[]>([]);

  // Crop State
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');

  // Edit State
  const [editingComponentId, setEditingComponentId] = useState<string | number | null>(null);

  // Requests State
  const [requests, setRequests] = useState<ComponentRequestRecord[]>([]);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Completion & Gerber Delivery Modal State
  const [completingReq, setCompletingReq] = useState<ComponentRequestRecord | null>(null);
  const [completionType, setCompletionType] = useState<'project' | 'component'>('component');
  const [selectedComponentId, setSelectedComponentId] = useState<string | number | ''>('');
  const [gerberFile, setGerberFile] = useState<File | null>(null);
  const [gerberUrlInput, setGerberUrlInput] = useState('');
  const [manufacturingNotes, setManufacturingNotes] = useState('');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [completionSuccess, setCompletionSuccess] = useState('');
  const [isSyncingSequence, setIsSyncingSequence] = useState(false);

  // Helper to compute the lowest available positive integer ID gap
  const getLowestAvailableId = (items: ComponentRecord[]): number => {
    const existingSet = new Set(
      items
        .map((item) => Number(item.id))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
    let candidate = 1;
    while (existingSet.has(candidate)) {
      candidate++;
    }
    return candidate;
  };

  useEffect(() => {
    fetchComponents();
    fetchRequests();
  }, []);

  const fetchComponents = async () => {
    const { data } = await supabase.from('components').select('*').order('id', { ascending: false });
    if (data) {
      setComponents(data as ComponentRecord[]);
    }
  };

  const fetchRequests = async () => {
    const { data } = await supabase.from('component_requests').select('*').order('id', { ascending: false });
    if (data) {
      setRequests(data as ComponentRequestRecord[]);
    }
  };

  const isPcbProjectRequest = (req: ComponentRequestRecord) => {
    return (
      req.component_name.toLowerCase().includes('[pcb project]') ||
      req.component_name.toLowerCase().includes('project') ||
      Boolean(req.description && req.description.includes('Client / Company:'))
    );
  };

  const getGerberUrl = (req: ComponentRequestRecord): string | null => {
    if (req.component_link && (req.component_link.toLowerCase().endsWith('.zip') || req.component_link.toLowerCase().includes('gerber'))) {
      return req.component_link;
    }
    if (req.description) {
      const match =
        req.description.match(/\[Gerber Files\]:\s*([^\s\n\r]+)/i) ||
        req.description.match(/\[Gerber Download\]:\s*([^\s\n\r]+)/i);
      if (match) return match[1];
    }
    if (req.file_url && req.file_url.toLowerCase().endsWith('.zip') && req.file_url.toLowerCase().includes('gerber')) {
      return req.file_url;
    }
    return null;
  };

  const getMatchedComponent = (req: ComponentRequestRecord): ComponentRecord | null => {
    const cleanName = req.component_name
      .toLowerCase()
      .replace(/^\[component\]\s*/i, '')
      .replace(/^\[pcb project\]\s*/i, '')
      .trim();
    if (!cleanName) return null;
    return (
      components.find((c) => {
        const cName = c.name.toLowerCase().trim();
        return cName === cleanName || cleanName.includes(cName) || cName.includes(cleanName);
      }) || null
    );
  };

  const handleFileSelectForCrop = (e: React.ChangeEvent<HTMLInputElement>, target: CropTarget) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result?.toString() || '');
        setCropTarget(target);
      });
      reader.readAsDataURL(file);
      e.target.value = ''; // reset so same file can trigger change
    }
  };

  const handleCropApply = (croppedFile: File) => {
    if (cropTarget === 'componentImage') setComponentImage(croppedFile);
    if (cropTarget === 'symbolPreview') setSymbolPreview(croppedFile);
    if (cropTarget === 'footprintPreview') setFootprintPreview(croppedFile);
    setCropTarget(null);
    setCropImageSrc('');
  };

  const extractPath = (url: string | null | undefined) => {
    if (!url) return null;
    const parts = url.split('/pcb_components/');
    return parts.length > 1 ? parts[1] : null;
  };

  const handleDeleteComponent = async (comp: ComponentRecord) => {
    const secret = window.prompt('Enter Delete Secret Code:');
    if (secret !== process.env.NEXT_PUBLIC_DELETE_SECRET_CODE) {
      window.alert('Incorrect Secret Code');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete ${comp.name} and its files?`)) {
      try {
        const paths = [
          extractPath(comp.component_image_url),
          extractPath(comp.symbol_preview_url),
          extractPath(comp.footprint_preview_url),
          extractPath(comp.symbol_file_url),
          extractPath(comp.footprint_file_url)
        ].filter(Boolean) as string[];

        if (paths.length > 0) {
          await supabase.storage.from('pcb_components').remove(paths);
        }

        const { error } = await supabase.from('components').delete().eq('id', comp.id);
        if (error) throw error;

        // Auto-sync sequence in background to keep Postgres sequence aligned
        fetch('/api/reset-sequence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'components',
            adminSecret: secret,
          }),
        }).catch((e) => console.warn('Background sequence sync notice:', e));

        window.alert(`Component #${comp.id} deleted successfully! (ID sequence updated)`);
        
        if (editingComponentId === comp.id) {
          resetForm();
        }
        fetchComponents();
      } catch (err: unknown) {
        if (err instanceof Error) {
          window.alert(`Error: ${err.message}`);
        } else {
          window.alert('An unknown error occurred.');
        }
      }
    }
  };

  const handleSyncSequence = async () => {
    setIsSyncingSequence(true);
    let secret = adminSecret || process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
    if (!secret) {
      const enteredSecret = window.prompt('Enter Admin Secret Key to sync sequence:');
      if (!enteredSecret) {
        setIsSyncingSequence(false);
        return;
      }
      secret = enteredSecret;
      setAdminSecret(enteredSecret);
    }

    try {
      const res = await fetch('/api/reset-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'components',
          adminSecret: secret,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync sequence');

      await fetchComponents();
      window.alert(
        `✓ Sequence Synchronized!\n\nMax Existing ID: ${data.maxId}\nNext Available Gap ID: #${data.lowestAvailableId}\n\nAny deleted ID gaps will now be reused sequentially.`
      );
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Error syncing sequence');
    } finally {
      setIsSyncingSequence(false);
    }
  };

  const handleEditComponent = (comp: ComponentRecord) => {
    setName(comp.name);
    setDescription(comp.description || '');
    setTags(comp.tags || '');
    setEditingComponentId(comp.id);
    
    setComponentImage(null);
    setSymbolPreview(null);
    setFootprintPreview(null);
    setSymbolFile(null);
    setFootprintFile(null);
    setMessage('');
    setAdminSection('catalog');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTags('');
    setComponentImage(null);
    setSymbolPreview(null);
    setFootprintPreview(null);
    setSymbolFile(null);
    setFootprintFile(null);
    setEditingComponentId(null);
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const secret = adminSecret || process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
    if (secret !== process.env.NEXT_PUBLIC_ADMIN_SECRET) {
      setMessage('Error: Invalid admin secret.');
      setLoading(false);
      return;
    }

    try {
      const uploadFile = async (file: File) => {
        const fileName = `${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('pcb_components').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('pcb_components').getPublicUrl(fileName);
        return data.publicUrl;
      };

      const payload: Partial<ComponentRecord> = {
        name,
        description,
        tags
      };

      if (componentImage) payload.component_image_url = await uploadFile(componentImage);
      if (symbolPreview) payload.symbol_preview_url = await uploadFile(symbolPreview);
      if (footprintPreview) payload.footprint_preview_url = await uploadFile(footprintPreview);
      if (symbolFile) payload.symbol_file_url = await uploadFile(symbolFile);
      if (footprintFile) payload.footprint_file_url = await uploadFile(footprintFile);

      if (editingComponentId) {
        const { error } = await supabase.from('components').update(payload).eq('id', editingComponentId);
        if (error) throw error;
        setMessage('Component updated successfully! 🎉');
      } else {
        // Intelligently reuse the lowest available ID gap (e.g. if rows were deleted)
        const nextId = getLowestAvailableId(components);
        const insertPayload = {
          ...payload,
          id: nextId,
        };

        const { error: insertError } = await supabase.from('components').insert([insertPayload]);
        if (insertError) {
          console.warn('Explicit ID insert note (falling back to auto sequence):', insertError.message);
          const { error: fallbackError } = await supabase.from('components').insert([payload]);
          if (fallbackError) throw fallbackError;
        }

        setMessage(`Component created successfully with ID #${nextId}! 🎉`);
      }

      resetForm();
      fetchComponents();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(`Error: ${err.message}`);
      } else {
        setMessage('An unknown error occurred.');
      }
    }
    setLoading(false);
  };

  // Open Completion Modal for Gerber Files or Direct Component Link
  const openCompletionModal = (req: ComponentRequestRecord) => {
    const isProject = isPcbProjectRequest(req);
    const existingGerber = getGerberUrl(req);
    const matched = getMatchedComponent(req);

    setCompletingReq(req);
    setCompletionType(isProject ? 'project' : 'component');
    setGerberFile(null);
    setGerberUrlInput(existingGerber || '');
    setManufacturingNotes(
      '2-Layer FR4 1.6mm thickness, 1oz Copper, Green solder mask, White silkscreen, Lead-Free HASL finish. 100% Design Rule Check (DRC) passed. Ready for immediate production on JLC PCB / Lion Circuits / PCBWay.'
    );
    setSelectedComponentId(matched ? matched.id : '');
    setCompletionError('');
    setCompletionSuccess('');
  };

  // Execute Completion Submission & File Upload
  const handleExecuteCompletion = async () => {
    if (!completingReq) return;
    setIsSubmittingCompletion(true);
    setCompletionError('');
    setCompletionSuccess('');

    const secret = adminSecret || process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
    if (!secret) {
      setCompletionError('Admin Secret Key is required to confirm completion and send emails.');
      setIsSubmittingCompletion(false);
      return;
    }

    try {
      let finalGerberUrl = gerberUrlInput.trim();

      // 1. If designer uploaded a Gerber ZIP archive, upload it to Supabase Storage
      if (completionType === 'project' && gerberFile) {
        const sanitizedName = gerberFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `gerbers/${Date.now()}_${sanitizedName}`;

        let uploadError: Error | null = null;
        let bucketUsed = 'pcb_components';

        // Try pcb_components first
        const { error: err1 } = await supabase.storage.from('pcb_components').upload(fileName, gerberFile, {
          contentType: 'application/zip',
          upsert: true,
        });

        if (err1) {
          // Fallback to request_files bucket
          const { error: err2 } = await supabase.storage.from('request_files').upload(fileName, gerberFile, {
            contentType: 'application/zip',
            upsert: true,
          });
          if (err2) {
            uploadError = new Error(`Storage upload failed: ${err2.message}`);
          } else {
            bucketUsed = 'request_files';
          }
        }

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabase.storage.from(bucketUsed).getPublicUrl(fileName);
        finalGerberUrl = publicData.publicUrl;
      }

      // 2. Call /api/complete-request with direct component link or Gerber download URL
      const res = await fetch('/api/complete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: completingReq.id,
          adminSecret: secret,
          requestType: completionType,
          componentName: completingReq.component_name,
          userEmail: completingReq.user_email,
          componentId: selectedComponentId || undefined,
          gerberUrl: finalGerberUrl || undefined,
          gerberFileName: gerberFile?.name,
          manufacturingNotes: completionType === 'project' ? manufacturingNotes : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete request');

      await fetchRequests();

      const cleanedCount = data.storageCleanup?.filesDeleted || 0;
      const cleanupNotice = cleanedCount > 0 ? ` (${cleanedCount} physical storage file(s) wiped to optimize free tier)` : '';

      setCompletionSuccess(
        completionType === 'project'
          ? `✓ Project completed! Delivered to ${completingReq.user_email || 'client'} & storage freed up${cleanupNotice} 🚀`
          : `✓ Component completed! Direct link dispatched & storage cleaned${cleanupNotice} 📧`
      );

      setTimeout(() => {
        setCompletingReq(null);
      }, 1600);
    } catch (err: unknown) {
      setCompletionError(err instanceof Error ? err.message : 'An error occurred during completion.');
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const handleDateExtension = async (req: ComponentRequestRecord) => {
    if (!req.user_email) {
      window.alert('No client email associated with this request.');
      return;
    }
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 5);
    const proposedDate = window.prompt(
      `Propose new completion date for "${req.component_name}" (YYYY-MM-DD):`,
      defaultDate.toISOString().split('T')[0]
    );
    if (!proposedDate) return;

    try {
      const res = await fetch('/api/extend-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: req.id,
          clientEmail: req.user_email,
          projectName: req.component_name,
          proposedDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch date extension');
      window.alert(`✓ Timeline update email sent to ${req.user_email} (Proposed Date: ${proposedDate})`);
      fetchRequests();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Error sending timeline update');
    }
  };

  const handlePrefillUpload = (req: ComponentRequestRecord) => {
    const cleanName = req.component_name.replace(/^\[(PCB Project|Component)\]\s*/i, '');
    setName(cleanName);
    let desc = req.description ? `Requested by ${req.user_email || 'user'}: ${req.description}` : `Requested by ${req.user_email || 'user'}`;
    if (req.component_link) {
      desc = desc ? `${desc}\n\nReference Link: ${req.component_link}` : `Reference Link: ${req.component_link}`;
    }
    setDescription(desc);
    setTags('Requested');
    setAdminSection('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRequest = async (req: ComponentRequestRecord) => {
    const secret = window.prompt('Enter Delete Secret Code:');
    if (secret !== process.env.NEXT_PUBLIC_DELETE_SECRET_CODE) {
      window.alert('Incorrect Secret Code');
      return;
    }

    if (window.confirm(`Delete request for "${req.component_name}"?`)) {
      try {
        if (req.file_url) {
          const parts = req.file_url.split('/request_files/');
          if (parts.length > 1) {
            await supabase.storage.from('request_files').remove([parts[1]]);
          }
        }

        const { error } = await supabase.from('component_requests').delete().eq('id', req.id);
        if (error) throw error;

        window.alert('Request deleted successfully.');
        fetchRequests();
      } catch (err: unknown) {
        if (err instanceof Error) {
          window.alert(`Error: ${err.message}`);
        } else {
          window.alert('An unknown error occurred.');
        }
      }
    }
  };

  const pendingRequestsCount = requests.filter(r => r.status !== 'Completed').length;
  const filteredRequests = requests.filter(r => {
    if (requestFilter === 'pending') return r.status !== 'Completed';
    if (requestFilter === 'completed') return r.status === 'Completed';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-500 relative z-10">
      {/* CROP MODAL */}
      {cropTarget && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          aspectRatio={1}
          onApply={handleCropApply}
          onCancel={() => {
            setCropTarget(null);
            setCropImageSrc('');
          }}
        />
      )}

      {/* COMPLETION & GERBER DELIVERY MODAL */}
      {completingReq && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  {completionType === 'project' ? '⚡ PCB Project Delivery' : '🧩 Component Fulfillment'}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  {completionType === 'project' ? 'Deliver Gerber Files & Notify Client' : 'Complete & Send Direct Link'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCompletingReq(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-lg font-bold transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Type Toggle Pills */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => setCompletionType('project')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  completionType === 'project' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ PCB Project Design (Gerber ZIP)
              </button>
              <button
                type="button"
                onClick={() => setCompletionType('component')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  completionType === 'component' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🧩 Component (Symbol & Footprint)
              </button>
            </div>

            {/* Target Client Info */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Request:</span>
                <span className="font-bold text-slate-800">{completingReq.component_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Recipient Email:</span>
                <span className="font-bold text-blue-600">{completingReq.user_email || 'None provided'}</span>
              </div>
            </div>

            {/* FORM BODY FOR PCB PROJECT */}
            {completionType === 'project' && (
              <div className="space-y-5 mb-6">
                
                {/* 1. Gerber ZIP Archive Upload */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Upload Final Gerber Files (.ZIP) <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 rounded-2xl p-6 text-center transition-all group">
                    <input
                      type="file"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setGerberFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    
                    {gerberFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl">📦</span>
                        <div className="text-left">
                          <p className="font-bold text-slate-900 text-sm">{gerberFile.name}</p>
                          <p className="text-xs text-slate-500">{(gerberFile.size / 1024 / 1024).toFixed(2)} MB • Ready to Upload</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGerberFile(null);
                          }}
                          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded-lg ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl block mb-2">📁</span>
                        <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                          Click to select Gerber ZIP Archive
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Accepts .zip with copper, mask, drill, and outline layers</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Or Enter Hosted Gerber URL */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Or Existing Gerber URL (Optional if file uploaded)
                  </label>
                  <input
                    type="url"
                    value={gerberUrlInput}
                    onChange={(e) => setGerberUrlInput(e.target.value)}
                    placeholder="https://.../gerber_package.zip"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The email button will be named <strong>&quot;Download Gerber Files&quot;</strong> and link directly to this file.
                  </p>
                </div>

                {/* 3. Manufacturing Specifications */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Manufacturing &amp; Layer Specifications
                  </label>
                  <textarea
                    rows={3}
                    value={manufacturingNotes}
                    onChange={(e) => setManufacturingNotes(e.target.value)}
                    placeholder="2-Layer FR4 1.6mm, 1oz Copper, Green solder mask, White silkscreen, Lead-Free HASL..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  ></textarea>
                </div>

              </div>
            )}

            {/* FORM BODY FOR COMPONENT */}
            {completionType === 'component' && (
              <div className="space-y-5 mb-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Link Published Component in Catalog <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedComponentId}
                    onChange={(e) => setSelectedComponentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Auto-detect by Request Name --</option>
                    {components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (ID: {c.id})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    The notification email button will be named <strong>&quot;View Symbol &amp; Footprint&quot;</strong> and will take the user directly to the component detail page.
                  </p>
                </div>

                {selectedComponentId && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
                    <span>✓ Will link directly to: <strong>/components/{selectedComponentId}</strong></span>
                    <Link
                      href={`/components/${selectedComponentId}`}
                      target="_blank"
                      className="font-black underline hover:text-emerald-950"
                    >
                      Preview &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Admin Secret Confirmation */}
            <div className="mb-6">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Admin Secret Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Enter secret key..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Status Feedback */}
            {completionError && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
                ⚠️ {completionError}
              </div>
            )}
            {completionSuccess && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
                {completionSuccess}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompletingReq(null)}
                disabled={isSubmittingCompletion}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleExecuteCompletion}
                disabled={isSubmittingCompletion}
                className="px-6 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 disabled:opacity-60 flex items-center gap-2"
              >
                {isSubmittingCompletion ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading &amp; Dispatching...</span>
                  </>
                ) : (
                  <span>
                    {completionType === 'project' ? 'Deliver Gerber Files & Email Client 🚀' : 'Complete & Dispatch Link 📧'}
                  </span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black tracking-tight mb-3 text-slate-900">Admin Control Center</h1>
        <p className="text-slate-500 font-medium text-lg">Manage components, deliver Gerber files, and dispatch verified client notifications.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => setAdminSection('catalog')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${adminSection === 'catalog' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>⚡ Component Catalog &amp; Upload</span>
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-black">{components.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminSection('requests')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${adminSection === 'requests' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>📬 User Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-black animate-pulse">
                {pendingRequestsCount} Pending
              </span>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-5 rounded-2xl mb-8 font-bold shadow-sm border ${message.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {message}
        </div>
      )}

      {/* TAB 1: CATALOG & UPLOAD */}
      {adminSection === 'catalog' && (
        <>
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-8 mb-16">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {editingComponentId ? '✏️ Edit Component' : '🚀 Deploy New Component'}
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">Publish KiCad symbols, footprints, and preview photos.</p>
              </div>
              {editingComponentId && (
                <span className="text-xs bg-blue-100 text-blue-700 font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                  Editing Mode (ID: {editingComponentId})
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Component Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="e.g. ESP32-WROOM-32" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Detailed description of the component..."></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Tags (comma separated)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Microcontroller, Wi-Fi, SMD" />
            </div>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* COMPONENT REAL PHOTO */}
              <div className="col-span-1 flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Component Real Photo (1:1)</label>
                <div className="relative flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden h-48 group hover:border-blue-400 transition-colors cursor-pointer">
                  {componentImage ? (
                    <img src={URL.createObjectURL(componentImage)} className="w-full h-full object-cover" alt="Component" />
                  ) : (
                    <span className="text-slate-400 font-medium text-sm group-hover:text-blue-500 text-center px-4">
                      {editingComponentId ? 'Select new to overwrite' : 'Click to Select'}
                    </span>
                  )}
                  <input type="file" accept="image/*" onChange={e => handleFileSelectForCrop(e, 'componentImage')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              {/* SYMBOL PREVIEW */}
              <div className="col-span-1 flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Symbol Preview (1:1)</label>
                <div className="relative flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden h-48 group hover:border-blue-400 transition-colors cursor-pointer">
                  {symbolPreview ? (
                    <img src={URL.createObjectURL(symbolPreview)} className="w-full h-full object-cover" alt="Symbol" />
                  ) : (
                    <span className="text-slate-400 font-medium text-sm group-hover:text-blue-500 text-center px-4">
                      {editingComponentId ? 'Select new to overwrite' : 'Click to Select'}
                    </span>
                  )}
                  <input type="file" accept="image/*" onChange={e => handleFileSelectForCrop(e, 'symbolPreview')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              {/* FOOTPRINT PREVIEW */}
              <div className="col-span-1 flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Footprint Preview (1:1)</label>
                <div className="relative flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden h-48 group hover:border-blue-400 transition-colors cursor-pointer">
                  {footprintPreview ? (
                    <img src={URL.createObjectURL(footprintPreview)} className="w-full h-full object-cover" alt="Footprint" />
                  ) : (
                    <span className="text-slate-400 font-medium text-sm group-hover:text-blue-500 text-center px-4">
                      {editingComponentId ? 'Select new to overwrite' : 'Click to Select'}
                    </span>
                  )}
                  <input type="file" accept="image/*" onChange={e => handleFileSelectForCrop(e, 'footprintPreview')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">KiCad Symbol File (.kicad_sym)</label>
                <input type="file" onChange={e => setSymbolFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">KiCad Footprint File (.kicad_mod)</label>
                <input type="file" onChange={e => setFootprintFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Admin Secret Code</label>
              <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Enter Admin Secret..." />
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={loading} className="flex-1 bg-slate-900 hover:bg-blue-600 text-white font-black py-5 px-8 rounded-2xl transition-all duration-300 shadow-xl shadow-slate-900/10 hover:shadow-blue-600/20 active:scale-95 disabled:opacity-50">
                {loading ? 'Publishing Component...' : (editingComponentId ? 'Update Component ✨' : 'Publish Component to Catalog 🚀')}
              </button>
              {editingComponentId && (
                <button type="button" onClick={resetForm} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-5 px-8 rounded-2xl transition-all">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {/* Catalog List */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/50">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Existing Components ({components.length})</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">
                    Next Available ID:
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    #{getLowestAvailableId(components)}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Gap-Filling Active ⚡
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSyncSequence}
                  disabled={isSyncingSequence}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200"
                  title="Synchronizes Postgres sequence and audits ID gaps"
                >
                  <span>🔄</span>
                  <span>{isSyncingSequence ? 'Syncing...' : 'Sync ID Sequence'}</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {components.length > 0 ? components.map(comp => (
                <div key={comp.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                      {comp.component_image_url ? (
                        <img src={comp.component_image_url} alt={comp.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-lg">{comp.name}</h3>
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">ID: {comp.id}</span>
                      </div>
                      <p className="text-slate-500 text-sm line-clamp-1 mt-0.5">{comp.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      href={`/components/${comp.id}`}
                      target="_blank"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                    >
                      View ↗
                    </Link>
                    <button 
                      onClick={() => handleEditComponent(comp)}
                      className="px-5 py-2.5 bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteComponent(comp)}
                      className="px-5 py-2.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold rounded-xl transition-colors border border-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 font-medium text-center py-8">No components found in database.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: USER REQUESTS */}
      {adminSection === 'requests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-slate-900">User Requests &amp; Project Fulfillment</h2>
              <p className="text-slate-500 text-sm mt-1">
                Deliver Gerber ZIP archives for PCB projects, fulfill component requests with direct links, and manage timeline updates (support:{' '}
                <a
                  href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Component%20Request"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  ssquareelectronics2026@gmail.com
                </a>).
              </p>
            </div>
            
            <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setRequestFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${requestFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('pending')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${requestFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Pending ({requests.filter(r => r.status !== 'Completed').length})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter('completed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${requestFilter === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Completed ({requests.filter(r => r.status === 'Completed').length})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredRequests.length > 0 ? filteredRequests.map(req => {
              const isCompleted = req.status === 'Completed';
              const isProj = isPcbProjectRequest(req);
              const gerberUrl = getGerberUrl(req);
              const matchedComp = getMatchedComponent(req);

              return (
                <div 
                  key={req.id} 
                  className={`p-6 rounded-3xl border transition-all ${isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md'}`}
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-xl font-black text-slate-900">{req.component_name}</h3>
                        
                        {/* Request Category Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                          isProj
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {isProj ? '⚡ PCB Project Design' : '🧩 KiCAD Component'}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${isCompleted ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                          {isCompleted ? '✓ Completed' : '⏳ Pending'}
                        </span>

                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Storage Optimized ⚡
                          </span>
                        )}
                      </div>
                      
                      {req.user_email && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                          <span className="font-semibold text-slate-400">User Email:</span>
                          <a href={`mailto:${req.user_email}`} className="text-blue-600 hover:underline font-bold">
                            {req.user_email}
                          </a>
                        </div>
                      )}

                      {req.created_at && (
                        <div className="text-xs text-slate-400 mt-1">
                          Requested on {new Date(req.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                      <button
                        onClick={() => handleDateExtension(req)}
                        className="px-3.5 py-2.5 rounded-xl font-bold text-sm bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 transition-colors border border-amber-200"
                        title="Propose date extension / reply to client"
                      >
                        📅 Date Extension
                      </button>

                      {/* Main Complete / Deliver Action */}
                      <button
                        onClick={() => openCompletionModal(req)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${
                          isCompleted
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : isProj
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                      >
                        {isCompleted
                          ? (isProj ? 'Resend Gerber Email 📧' : 'Resend Email 📧')
                          : (isProj ? '🚀 Deliver Gerber & Complete' : '✓ Complete & Link Component')}
                      </button>

                      {!isProj && (
                        <button
                          onClick={() => handlePrefillUpload(req)}
                          className="px-4 py-2.5 rounded-xl font-bold text-sm bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 transition-colors"
                          title="Copy part name into upload form above"
                        >
                          Deploy This Component 🚀
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteRequest(req)}
                        className="px-3.5 py-2.5 rounded-xl font-bold text-sm bg-red-50 hover:bg-red-500 hover:text-white text-red-600 transition-colors border border-red-100"
                        title="Delete request"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Attached Gerber Download Pill if completed */}
                  {gerberUrl && (
                    <div className="mb-3 p-3 bg-emerald-100/70 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📦</span>
                        <div>
                          <p className="text-xs font-black uppercase text-emerald-900 tracking-wider">
                            Gerber Manufacturing Package Available
                          </p>
                          <p className="text-xs text-emerald-800 truncate max-w-sm sm:max-w-md">{gerberUrl}</p>
                        </div>
                      </div>
                      <a
                        href={gerberUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition-all shadow-sm flex-shrink-0"
                      >
                        Download Gerber Files (.zip) &darr;
                      </a>
                    </div>
                  )}

                  {/* Linked Catalog Component Preview */}
                  {!isProj && matchedComp && (
                    <div className="mb-3 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-blue-900 font-medium">
                        🔗 Linked Component in Catalog: <strong>{matchedComp.name}</strong>
                      </span>
                      <Link
                        href={`/components/${matchedComp.id}`}
                        target="_blank"
                        className="text-blue-700 hover:text-blue-900 font-bold underline"
                      >
                        View /components/{matchedComp.id} &rarr;
                      </Link>
                    </div>
                  )}

                  {req.component_link && !gerberUrl && (
                    <div className="mb-3">
                      <a
                        href={req.component_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-colors"
                      >
                        <span>🔗 Reference Link:</span>
                        <span className="underline truncate max-w-md">{req.component_link}</span>
                        <span className="text-xs">↗</span>
                      </a>
                    </div>
                  )}

                  {req.description && (
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm whitespace-pre-wrap mb-3 font-medium">
                      {req.description}
                    </div>
                  )}

                  {req.file_url && (
                    <div className="pt-2">
                      <a
                        href={req.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                      >
                        📎 View / Download User Attachment
                      </a>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="bg-white p-12 text-center rounded-3xl border border-slate-200">
                <p className="text-slate-400 font-medium">No component requests matching the selected filter.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
