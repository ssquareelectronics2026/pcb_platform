import Link from 'next/link';

export const metadata = {
  title: 'Home | S SQUARE ELECTRONICS - PCB Component Hub',
  description: 'Welcome to S SQUARE ELECTRONICS PCB Component Hub. Download verified KiCAD schematic symbols (.kicad_sym) and PCB footprints (.kicad_mod).',
};

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24 animate-in fade-in duration-500 relative z-10 pb-8">
      
      {/* HERO SECTION */}
      <section className="text-center py-12 sm:py-20 px-4 bg-white/70 border border-slate-200/80 backdrop-blur-sm rounded-[2.5rem] shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/70 via-white to-emerald-50/40 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          {/* Brand Logo Presentation */}
          <div className="inline-flex p-3 rounded-3xl bg-white border border-slate-200 shadow-lg shadow-blue-900/5 mb-2 hover:scale-105 transition-transform duration-300">
            <img 
              src="/logo.jpg" 
              alt="S SQUARE ELECTRONICS Logo" 
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl" 
            />
          </div>

          <div className="inline-block">
            <span className="text-xs uppercase font-extrabold tracking-widest text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 shadow-sm">
              S SQUARE ELECTRONICS
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            PCB Component Hub
          </h1>

          <p className="text-slate-600 text-base sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Your dedicated engineering resource for verified KiCAD schematic symbols (<code className="text-blue-700 bg-blue-50 font-semibold px-1.5 py-0.5 rounded text-sm sm:text-base">.kicad_sym</code>) and PCB footprints (<code className="text-emerald-700 bg-emerald-50 font-semibold px-1.5 py-0.5 rounded text-sm sm:text-base">.kicad_mod</code>).
          </p>

          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Accelerate your hardware designs with verified, production-ready KiCAD libraries and step-by-step documentation.
          </p>

          {/* Call-to-Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 max-w-2xl mx-auto">
            <Link
              href="/components"
              className="px-7 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Browse Components</span>
              <span>&rarr;</span>
            </Link>

            <Link
              href="/tutorial/symbol"
              className="px-6 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-95"
            >
              Symbol Tutorial
            </Link>

            <Link
              href="/tutorial/footprint"
              className="px-6 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-95"
            >
              Footprint Tutorial
            </Link>

            <a
              href="https://www.kicad.org/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-2xl shadow-sm transition-all active:scale-95 inline-flex items-center gap-1.5"
            >
              <span>Download KiCAD</span>
              <span className="text-xs">↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / PLATFORM FEATURES */}
      <section className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3.5 py-1">
            Platform Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            How It Works
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Everything you need to go from component selection to PCB routing in KiCAD.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Browse & Download */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                📦
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                1. Browse & Download
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Search through our catalog of verified ICs, microcontrollers, SMD passives, and connectors. Preview 2D footprints and download CAD files directly.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-100">
              <Link
                href="/components"
                className="text-blue-600 font-bold text-sm inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
              >
                <span>Explore Catalog</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Step-by-Step Tutorials */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                📚
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                2. Step-by-Step Tutorials
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Follow our official documentation tutorials with screenshots to import symbols into the KiCAD Symbol Editor and footprints into the Footprint Editor.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-4">
              <Link
                href="/tutorial/symbol"
                className="text-blue-600 font-bold text-sm inline-flex items-center gap-1 hover:underline"
              >
                Symbol Guide &rarr;
              </Link>
              <Link
                href="/tutorial/footprint"
                className="text-emerald-600 font-bold text-sm inline-flex items-center gap-1 hover:underline"
              >
                Footprint Guide &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3: Custom Component Requests */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                🚀
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                3. Request Custom Parts
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Can&apos;t find a specific component? Submit a reference URL, datasheet, or part description. Our team will design, verify, and email you when it&apos;s ready.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-100">
              <Link
                href="/request"
                className="text-amber-700 font-bold text-sm inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
              >
                <span>Request Component</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* VALUE HIGHLIGHTS */}
      <section className="bg-slate-900 text-white rounded-[2.5rem] p-8 sm:p-14 relative overflow-hidden shadow-2xl">
        <div className="max-w-4xl mx-auto space-y-10 relative z-10">
          <div className="text-center space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-blue-400 bg-blue-950/60 border border-blue-800 rounded-full px-4 py-1.5">
              Why S SQUARE ELECTRONICS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Designed by Hardware Engineers, for Hardware Engineers
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1">KiCAD 7 &amp; 8 Ready</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  All exported files strictly follow KiCAD s-expression standards for instant import without format conversion.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1">Verified Dimensions &amp; Pinouts</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Footprint pad geometries, pin numbering, and 3D keep-outs are checked against manufacturer specifications.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1">100% Free &amp; Open Access</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  No subscription fees or download caps. Open access for hobbyists, engineering students, and commercial teams.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1">Direct Engineering Support</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Have questions or custom requirements? Email us directly at <a href="mailto:ssquareelectronics2026@gmail.com" className="text-blue-400 underline">ssquareelectronics2026@gmail.com</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="text-center bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 shadow-sm">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
          Ready to start your PCB layout?
        </h3>
        <p className="text-slate-500 text-base max-w-lg mx-auto mb-8 font-medium">
          Browse our component catalog or request a custom footprint for your hardware project.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/components"
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm active:scale-95"
          >
            Browse Catalog &rarr;
          </Link>
          <Link
            href="/request"
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all text-sm active:scale-95 border border-slate-200"
          >
            Request a Component
          </Link>
        </div>
      </section>

    </div>
  );
}
