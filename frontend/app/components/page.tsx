'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';

const fadeEase = [0.22, 1, 0.36, 1] as const;

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: fadeEase },
  },
};

function CatalogContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('search') || '';
  const [components, setComponents] = useState<any[]>([]);
  const [search, setSearch] = useState(initialQuery);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = searchParams?.get('search');
    if (q !== null && q !== undefined) {
      setSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchComponents();
  }, [search]);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      let query = supabase.from('components').select('*').order('id', { ascending: false });
      if (search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,tags.ilike.%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Supabase fetch error:', error);
      }
      setComponents(data || []);
    } catch (err) {
      console.error('Fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Search Panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: fadeEase }}
        className="bg-white border border-[#161513]/10 rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <p className="font-mono text-xs text-[#9a6320] tabular-nums">
              Library · KiCAD 7 / 8
            </p>
            <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#161513]">
              PCB components catalog
            </h1>
            <p className="text-[#52504a] text-sm sm:text-base leading-relaxed font-normal">
              Search, preview, and download verified schematic symbols (
              <code className="font-mono text-xs px-1.5 py-0.5 bg-[#eeede8] text-[#9a6320] rounded border border-[#161513]/10">
                .kicad_sym
              </code>
              ) and board footprints (
              <code className="font-mono text-xs px-1.5 py-0.5 bg-[#eeede8] text-[#167c4c] rounded border border-[#161513]/10">
                .kicad_mod
              </code>
              ).
            </p>
          </div>

          <div className="font-mono text-xs text-[#76736c] tabular-nums">
            Verified IPC / manufacturer specs
          </div>
        </div>

        {/* Technical Search Input */}
        <div className="flex items-center h-11 bg-[#f6f5f1] border border-[#161513]/12 focus-within:border-[#9a6320] focus-within:bg-white rounded-lg px-3.5 gap-2.5 transition-colors duration-150 ease-unslop">
          <Search className="w-4 h-4 text-[#76736c] flex-shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search by part number or tag (e.g. ESP32, ATmega328P)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[#161513] placeholder-[#76736c] focus:outline-none font-mono"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="w-7 h-7 rounded-md text-[#76736c] hover:text-[#161513] hover:bg-[#eeede8] inline-flex items-center justify-center transition-colors duration-150 ease-unslop flex-shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Count & Request Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 px-1">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-lg font-medium text-[#161513]">Available components</h2>
          {!loading && (
            <span className="font-mono text-xs text-[#76736c] tabular-nums">
              {components.length} {components.length === 1 ? 'part' : 'parts'}
            </span>
          )}
        </div>

        <Link
          href="/request/component"
          className="text-sm font-medium text-[#9a6320] hover:text-[#7a4c14] inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop"
        >
          <span>Request a missing component</span>
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Components Grid */}
      {loading ? (
        <div className="py-20 text-[#76736c] text-sm font-mono flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#9a6320] animate-spin" strokeWidth={1.5} />
          <span>Loading catalog index</span>
        </div>
      ) : (
        <motion.div
          key={search}
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {components.map((comp) => {
            const displayImage =
              comp.component_image_url || comp.symbol_preview_url || comp.footprint_preview_url;

            return (
              <motion.div key={comp.id} variants={cardVariants} className="h-full">
                <Link href={`/components/${comp.id}`} className="group block h-full rounded-xl">
                  <div className="bg-white border border-[#161513]/10 hover:border-[#161513]/25 rounded-xl overflow-hidden transition-[border-color,box-shadow] duration-150 ease-unslop hover:shadow-[0_4px_16px_rgba(22,21,19,0.06)] flex flex-col h-full">
                    {/* Preview Well */}
                    <div className="h-52 bg-vellum-grid relative flex items-center justify-center border-b border-[#161513]/10 p-5 overflow-hidden">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={comp.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <span className="font-mono text-xs text-[#76736c]">No preview</span>
                      )}

                      <span className="absolute top-3 right-3 font-mono tabular-nums text-[11px] font-medium bg-white/95 text-[#52504a] border border-[#161513]/10 px-2 py-0.5 rounded">
                        ID #{comp.id}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-1.5">
                        <h3 className="font-mono text-base font-medium text-[#161513] tracking-tight group-hover:text-[#9a6320] transition-colors duration-150 ease-unslop">
                          {comp.name}
                        </h3>
                        <p className="text-[#52504a] text-sm line-clamp-2 leading-relaxed font-normal">
                          {comp.description ||
                            'Verified KiCAD symbol and footprint available for download.'}
                        </p>
                      </div>

                      <div className="pt-3.5 border-t border-[#161513]/8 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-[#eeede8] text-[#9a6320] border border-[#161513]/8">
                            .kicad_sym
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#eeede8] text-[#167c4c] border border-[#161513]/8">
                            .kicad_mod
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[#76736c] group-hover:text-[#161513] transition-colors duration-150 ease-unslop inline-flex items-center gap-1">
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {components.length === 0 && (
            <div className="col-span-full text-center bg-white border border-[#161513]/10 rounded-2xl py-16 px-4">
              <div className="w-10 h-10 rounded-lg bg-[#eeede8] border border-[#161513]/10 text-[#52504a] flex items-center justify-center mx-auto mb-4">
                <Search className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-[#161513] mb-1.5">No matching components</h3>
              <p className="text-[#52504a] text-sm max-w-md mx-auto mb-6">
                No parts matched <span className="font-mono text-[#161513]">&quot;{search}&quot;</span>. Submit a part request and our engineering desk will prepare the library files.
              </p>
              <Link
                href="/request/component"
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#161513] hover:bg-[#2a2824] text-white font-medium rounded-lg text-sm transition-colors duration-150 ease-unslop active:scale-[0.98]"
              >
                <span>Request this component</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default function ComponentsCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-[#76736c] text-sm font-mono flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#9a6320] animate-spin" strokeWidth={1.5} />
          <span>Loading catalog index</span>
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
