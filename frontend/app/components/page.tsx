'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ComponentsCatalogPage() {
  const [components, setComponents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
        console.error("Supabase fetch error:", error);
      }
      setComponents(data || []);
    } catch (err) {
      console.error("Fetch exception:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 relative z-10">
      {/* Header and Search Bar */}
      <div className="text-center space-y-6 py-12 px-4 bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-emerald-50/60 opacity-60"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-block text-xs uppercase font-extrabold tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-3">
            Hardware Library
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            PCB Components Catalog
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mt-3 font-medium leading-relaxed">
            Search, preview, and download verified KiCAD symbols (<code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-sm">.kicad_sym</code>) and footprints (<code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-sm">.kicad_mod</code>).
          </p>
          
          <div className="max-w-xl mx-auto mt-8 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <span className="pl-5 text-slate-400 text-lg">🔍</span>
              <input 
                type="text" 
                placeholder="Search by part number (e.g. ESP32, ATmega328P) or tags..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent py-4 px-4 text-slate-900 placeholder-slate-400 focus:outline-none font-medium text-base"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="pr-5 text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Components Count Bar */}
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-bold text-slate-800">
          Available Components {components.length > 0 && <span className="text-slate-400 text-sm font-normal">({components.length})</span>}
        </h2>
        <Link 
          href="/request" 
          className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
        >
          <span>Can't find a component? Request it</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Components Grid */}
      {loading ? (
        <div className="text-center py-24 text-slate-400 font-bold text-lg flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {components.map(comp => {
            const displayImage = comp.component_image_url || comp.symbol_preview_url || comp.footprint_preview_url;
            
            return (
              <Link href={`/components/${comp.id}`} key={comp.id} className="group block">
                <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 flex flex-col h-full">
                  <div className="h-56 bg-slate-50 relative flex items-center justify-center border-b border-slate-100 p-6">
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        alt={comp.name} 
                        className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-semibold text-sm">
                        No Preview Available
                      </div>
                    )}
                    <span className="absolute top-4 right-4 text-[11px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-sm text-slate-600 border border-slate-200/60 px-2.5 py-1 rounded-full shadow-sm">
                      KiCAD
                    </span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight group-hover:text-blue-600 transition-colors">
                        {comp.name}
                      </h3>
                      <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
                        {comp.description || 'Verified schematic symbol and PCB footprint.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {comp.tags ? comp.tags.split(',').slice(0, 3).map((tag: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200/60 text-[11px] font-bold rounded-lg text-slate-600">
                            {tag.trim()}
                          </span>
                        )) : (
                          <span className="text-xs text-slate-400 font-medium">Verified CAD</span>
                        )}
                      </div>
                      <span className="text-blue-600 font-black text-sm group-hover:translate-x-0.5 transition-transform">
                        View &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {components.length === 0 && (
            <div className="col-span-full text-center bg-white border border-slate-200 rounded-3xl py-16 px-4">
              <span className="text-4xl block mb-3">🔍</span>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No components found</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                We couldn't find any components matching &quot;{search}&quot;. You can submit a request and our engineers will create it for you.
              </p>
              <Link 
                href="/request" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 text-sm transition-all"
              >
                Request This Component &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
