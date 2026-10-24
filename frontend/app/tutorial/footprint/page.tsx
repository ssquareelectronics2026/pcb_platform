import Link from 'next/link';

export const metadata = {
  title: 'KiCAD Footprint Tutorial | PCB Component Hub',
  description: 'Documentation tutorial for adding footprints in KiCAD software.',
};

export default function FootprintTutorialPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      {/* Navigation breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/tutorial/symbol" 
          className="text-blue-600 hover:text-blue-800 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors"
        >
          &larr; Symbol Tutorial
        </Link>
        <Link
          href="/"
          className="text-slate-500 hover:text-slate-800 font-semibold text-sm inline-flex items-center gap-1 transition-colors"
        >
          Back to Library &rarr;
        </Link>
      </div>

      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-sm mb-10 text-center">
        <span className="inline-block text-xs uppercase font-extrabold tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4">
          KiCAD Documentation
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">
          DOCUMENTATION TUTORIAL FOR ADDING THE SYMBOL AND FOOTPRINT IN KiCAD SOFTWARE
        </h1>
        <h2 className="text-lg sm:text-xl font-bold text-slate-600 mt-4 border-t border-slate-100 pt-4">
          How to add Footprint in the KiCAD software?
        </h2>
      </div>

      {/* Placeholder Content Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-16 text-center shadow-sm">
        <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-inner">
          📐
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
          Footprint Tutorial Steps Coming Soon
        </h3>
        <p className="text-slate-500 max-w-lg mx-auto text-base leading-relaxed mb-8">
          The step-by-step documentation with screenshots for importing and associating footprints in KiCAD is currently being prepared.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/tutorial/symbol"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm active:scale-95"
          >
            &larr; View Symbol Tutorial
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm active:scale-95 border border-slate-200"
          >
            Browse Library
          </Link>
        </div>
      </div>
    </div>
  );
}
