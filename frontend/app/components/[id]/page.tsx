'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ComponentDetails() {
  const params = useParams();
  const id = params?.id;
  const [comp, setComp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Post-Download Tutorial Popup Modal State
  const [downloadPopup, setDownloadPopup] = useState<{
    isOpen: boolean;
    type: 'symbol' | 'footprint';
  } | null>(null);

  useEffect(() => {
    const fetchComponent = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.from('components').select('*').eq('id', id).maybeSingle();
        if (error) {
          console.error("Supabase error:", error);
        }
        setComp(data || null);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchComponent();
  }, [id]);

  const handleDownload = async (fileUrl: string | null | undefined, type: 'symbol' | 'footprint') => {
    if (!fileUrl) return;

    // 1. Trigger File Download (strips leading timestamp prefix)
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const rawName = fileUrl.split('/').pop() || (type === 'symbol' ? `${comp?.name || 'component'}.kicad_sym` : `${comp?.name || 'component'}.kicad_mod`);
      const cleanName = decodeURIComponent(rawName).replace(/^\d+_/, '');

      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    } catch (err) {
      console.warn("Direct blob download failed, falling back to window.open", err);
      window.open(fileUrl, '_blank');
    }

    // 2. Immediately open the Post-Download Tutorial Popup Modal
    setDownloadPopup({
      isOpen: true,
      type,
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-bold text-slate-600">Loading Component...</p>
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <h2 className="text-2xl font-black text-slate-800">Component Not Found</h2>
        <p className="text-slate-500">The component you are looking for does not exist or was deleted.</p>
        <Link href="/components" className="mt-4 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">
          &larr; Back to Components
        </Link>
      </div>
    );
  }

  const componentPhoto = comp.component_image_url || comp.symbol_preview_url || comp.footprint_preview_url;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      <Link href="/components" className="text-blue-600 hover:text-blue-800 font-semibold mb-6 inline-flex items-center gap-2">
        &larr; Back to Components
      </Link>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* LEFT SIDE: Real Hardware Photo & Details */}
        <div className="w-full xl:w-1/3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-64">
            {componentPhoto ? (
              <img src={componentPhoto} alt={comp.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
            ) : (
              <p className="text-slate-400 font-medium">No Hardware Photo</p>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{comp.name}</h1>
            <p className="mt-4 text-slate-600 leading-relaxed text-sm md:text-base">{comp.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {comp.tags?.split(',').map((tag: string, index: number) => (
              <span key={index} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">
                {tag.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: Symbol & Footprint Side-by-Side */}
        <div className="w-full xl:w-2/3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <span className="font-bold text-slate-900 border-b-2 border-blue-600 pb-1">Symbol and Footprint</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Symbol Box */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-white px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Symbol</h3>
              </div>
              {/* KiCad schematic style cream paper background with blend */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-[260px] bg-[#fcfbf7] relative">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                {comp.symbol_preview_url ? (
                  <img 
                    src={comp.symbol_preview_url} 
                    alt="Symbol Preview" 
                    className="max-h-56 object-contain mix-blend-multiply relative z-10" 
                  />
                ) : (
                  <p className="text-slate-400 font-medium text-sm relative z-10">No Symbol Preview</p>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => handleDownload(comp.symbol_file_url, 'symbol')}
                  disabled={!comp.symbol_file_url}
                  className={`block w-full text-center font-bold py-3 rounded-lg transition-colors border ${comp.symbol_file_url ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white cursor-pointer active:scale-95' : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'}`}
                >
                  Download Symbol (.lib)
                </button>
              </div>
            </div>

            {/* Footprint Box (Dark Grid Style) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Footprint</h3>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">2D Model</span>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 min-h-[260px] bg-slate-950 relative">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                {comp.footprint_preview_url ? (
                  <img src={comp.footprint_preview_url} alt="Footprint Preview" className="max-h-56 object-contain relative z-10" />
                ) : (
                  <p className="text-slate-500 font-medium text-sm relative z-10">No Footprint Preview</p>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => handleDownload(comp.footprint_file_url, 'footprint')}
                  disabled={!comp.footprint_file_url}
                  className={`block w-full text-center font-bold py-3 rounded-lg transition-colors border ${comp.footprint_file_url ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white cursor-pointer active:scale-95' : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'}`}
                >
                  Download Footprint (.kicad_mod)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post-Download Tutorial Popup Modal */}
      {downloadPopup && downloadPopup.isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDownloadPopup(null)}
        >
          <div 
            className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl border border-slate-100 text-center relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button (X) */}
            <button
              type="button"
              onClick={() => setDownloadPopup(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-inner">
              🎉
            </div>

            {/* Title */}
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Thanks for downloading!
            </h3>

            {/* Text */}
            <p className="text-slate-600 text-base font-medium mb-6 leading-relaxed">
              {downloadPopup.type === 'symbol' 
                ? 'How to add this symbol in KiCAD?' 
                : 'How to add this PCB footprint in your KiCAD software?'}
            </p>

            {/* Tutorial Button (opens tutorial in new tab) */}
            <div className="space-y-3">
              <a
                href={downloadPopup.type === 'symbol' ? '/tutorial/symbol' : '/tutorial/footprint'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDownloadPopup(null)}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-base rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Tutorial</span>
                <span aria-hidden="true">&rarr;</span>
              </a>

              <button
                type="button"
                onClick={() => setDownloadPopup(null)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
