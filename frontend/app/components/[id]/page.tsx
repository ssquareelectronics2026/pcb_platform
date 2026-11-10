'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';

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
        const { data, error } = await supabase
          .from('components')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) {
          console.error('Supabase error:', error);
        }
        setComp(data || null);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComponent();
  }, [id]);

  const handleDownload = async (
    fileUrl: string | null | undefined,
    type: 'symbol' | 'footprint'
  ) => {
    if (!fileUrl) return;

    // 1. Trigger File Download (strips leading timestamp prefix)
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const rawName =
        fileUrl.split('/').pop() ||
        (type === 'symbol'
          ? `${comp?.name || 'component'}.kicad_sym`
          : `${comp?.name || 'component'}.kicad_mod`);
      const cleanName = decodeURIComponent(rawName).replace(/^\d+_/, '');

      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    } catch (err) {
      console.warn('Direct blob download failed, falling back to window.open', err);
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-sm font-mono text-[#76736c]">
        <Loader2 className="w-6 h-6 text-[#9a6320] animate-spin" strokeWidth={1.5} />
        <span>Loading component specification</span>
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <h2 className="text-2xl font-medium text-[#161513]">Component not found</h2>
        <p className="text-sm text-[#52504a] max-w-md">
          The component record you requested does not exist or has been removed from the catalog.
        </p>
        <Link
          href="/components"
          className="mt-2 h-10 px-4 bg-[#161513] hover:bg-[#2a2824] text-white font-medium text-sm rounded-lg inline-flex items-center gap-2 transition-colors duration-150 ease-unslop"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Back to components</span>
        </Link>
      </div>
    );
  }

  const componentPhoto =
    comp.component_image_url || comp.symbol_preview_url || comp.footprint_preview_url;
  const symbolExtension = comp.symbol_file_url?.toLowerCase().endsWith('.lib')
    ? '.lib'
    : '.kicad_sym';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-[#161513]/10 pb-4">
        <Link
          href="/components"
          className="text-sm font-medium text-[#52504a] hover:text-[#161513] inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Back to components</span>
        </Link>

        <span className="font-mono tabular-nums text-xs text-[#76736c]">
          Catalog ID #{comp.id}
        </span>
      </div>

      {/* Main Split Specification Layout */}
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* LEFT COLUMN: Hardware Photo & Part Metadata */}
        <div className="w-full xl:w-[36%] space-y-5">
          <div className="bg-white border border-[#161513]/10 rounded-xl p-6 flex items-center justify-center h-64 relative">
            {componentPhoto ? (
              <img
                src={componentPhoto}
                alt={comp.name}
                className="max-h-full max-w-full object-contain mix-blend-multiply"
              />
            ) : (
              <p className="font-mono text-xs text-[#76736c]">No hardware image</p>
            )}
          </div>

          <div className="space-y-2.5">
            <h1 className="font-mono text-2xl sm:text-3xl font-medium text-[#161513] tracking-tight">
              {comp.name}
            </h1>
            <p className="text-[#52504a] leading-relaxed text-sm sm:text-base font-normal">
              {comp.description ||
                'Verified KiCAD schematic symbol and PCB footprint available for download.'}
            </p>
          </div>

          {comp.tags && (
            <div className="flex flex-wrap gap-2 pt-1">
              {comp.tags
                .split(',')
                .filter((t: string) => t.trim())
                .map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="font-mono px-2.5 py-1 bg-[#eeede8] text-[#161513] rounded-md text-xs border border-[#161513]/10"
                  >
                    {tag.trim()}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Symbol & Footprint Drafting Sheet */}
        <div className="w-full xl:w-[64%] bg-white border border-[#161513]/10 rounded-xl overflow-hidden">
          <div className="bg-[#f6f5f1] border-b border-[#161513]/10 px-5 py-3 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-[#161513]">
              Symbol &amp; footprint files
            </span>
            <span className="font-mono text-xs text-[#76736c]">KiCAD 7 / 8</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#161513]/10">
            {/* Symbol Pane */}
            <div className="flex flex-col">
              <div className="px-4 py-3 border-b border-[#161513]/8 flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#161513]">Symbol</h2>
                <span className="font-mono text-xs text-[#9a6320]">{symbolExtension}</span>
              </div>

              {/* KiCAD schematic vellum canvas */}
              <div className="flex-1 flex items-center justify-center p-5 min-h-[264px] bg-vellum-grid relative">
                {comp.symbol_preview_url ? (
                  <img
                    src={comp.symbol_preview_url}
                    alt={`${comp.name} schematic symbol preview`}
                    className="max-h-56 object-contain mix-blend-multiply relative z-10"
                  />
                ) : (
                  <p className="font-mono text-xs text-[#76736c] relative z-10">
                    No symbol preview
                  </p>
                )}
              </div>

              <div className="p-4 bg-white border-t border-[#161513]/8">
                <button
                  type="button"
                  onClick={() => handleDownload(comp.symbol_file_url, 'symbol')}
                  disabled={!comp.symbol_file_url}
                  className={`w-full h-10 px-4 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors duration-150 ease-unslop ${
                    comp.symbol_file_url
                      ? 'bg-[#161513] hover:bg-[#9a6320] text-white cursor-pointer active:scale-[0.98]'
                      : 'bg-[#eeede8] text-[#76736c] border border-[#161513]/10 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" strokeWidth={1.5} />
                  <span>
                    Download symbol (<span className="font-mono">{symbolExtension}</span>)
                  </span>
                </button>
              </div>
            </div>

            {/* Footprint Pane */}
            <div className="flex flex-col">
              <div className="px-4 py-3 border-b border-[#161513]/8 flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#161513]">Footprint</h2>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[#76736c]">2D layout</span>
                  <span className="text-[#167c4c]">.kicad_mod</span>
                </div>
              </div>

              {/* Soldermask dark CAD canvas */}
              <div className="flex-1 flex items-center justify-center p-5 min-h-[264px] bg-soldermask-grid relative">
                {comp.footprint_preview_url ? (
                  <img
                    src={comp.footprint_preview_url}
                    alt={`${comp.name} PCB footprint preview`}
                    className="max-h-56 object-contain relative z-10"
                  />
                ) : (
                  <p className="font-mono text-xs text-[#8f8c84] relative z-10">
                    No footprint preview
                  </p>
                )}
              </div>

              <div className="p-4 bg-white border-t border-[#161513]/8">
                <button
                  type="button"
                  onClick={() => handleDownload(comp.footprint_file_url, 'footprint')}
                  disabled={!comp.footprint_file_url}
                  className={`w-full h-10 px-4 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors duration-150 ease-unslop ${
                    comp.footprint_file_url
                      ? 'bg-[#161513] hover:bg-[#167c4c] text-white cursor-pointer active:scale-[0.98]'
                      : 'bg-[#eeede8] text-[#76736c] border border-[#161513]/10 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" strokeWidth={1.5} />
                  <span>
                    Download footprint (<span className="font-mono">.kicad_mod</span>)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post-Download Tutorial Popup Modal */}
      {downloadPopup && downloadPopup.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#161513]/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setDownloadPopup(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-[#161513]/12 shadow-[0_8px_24px_rgba(22,21,19,0.12)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setDownloadPopup(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#76736c] hover:text-[#161513] hover:bg-[#eeede8] inline-flex items-center justify-center transition-colors duration-150 ease-unslop"
              aria-label="Close dialog"
            >
              <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>

            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[#167c4c]/10 border border-[#167c4c]/20 text-[#167c4c] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-medium text-[#161513] tracking-tight">
                  Download started
                </h3>
                <p className="text-[#52504a] text-sm leading-relaxed">
                  {downloadPopup.type === 'symbol'
                    ? 'Follow the Symbol Tutorial to import this .kicad_sym library file into KiCAD.'
                    : 'Follow the Footprint Tutorial to add this .kicad_mod file to your KiCAD library folder.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <a
                  href={
                    downloadPopup.type === 'symbol'
                      ? '/tutorial/symbol'
                      : '/tutorial/footprint'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDownloadPopup(null)}
                  className="flex-1 h-10 px-4 bg-[#161513] hover:bg-[#2a2824] text-white font-medium text-sm rounded-lg inline-flex items-center justify-center gap-2 transition-colors duration-150 ease-unslop active:scale-[0.98]"
                >
                  <span>Open tutorial</span>
                  <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                </a>

                <button
                  type="button"
                  onClick={() => setDownloadPopup(null)}
                  className="h-10 px-4 bg-[#eeede8] hover:bg-[#e4e2dc] text-[#161513] font-medium text-sm rounded-lg transition-colors duration-150 ease-unslop"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
