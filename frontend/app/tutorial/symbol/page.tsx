import Link from 'next/link';

export const metadata = {
  title: 'KiCAD Symbol Tutorial | PCB Component Hub',
  description: 'Documentation tutorial for adding symbols and footprints in KiCAD software.',
};

export default function SymbolTutorialPage() {
  const steps = [
    {
      stepNumber: 1,
      title: 'Step 1',
      text: 'After downloading the <component_name>.kicad_sym.',
      image: null,
    },
    {
      stepNumber: 2,
      title: 'Step 2',
      text: 'Open your KiCAD software and open the Symbols Editor.',
      image: '/tutorial/IMG 1.png',
      alt: 'Open KiCAD software and open Symbols Editor',
    },
    {
      stepNumber: 3,
      title: 'Step 3',
      text: 'Now, click on the File tab present on the left top corner.',
      image: '/tutorial/IMG 2.png',
      alt: 'Click File tab on left top corner',
    },
    {
      stepNumber: 4,
      title: 'Step 4',
      text: 'A list of choices opens, and click on the Add Library… option and navigate to the folder path where you kept the <component_name>.kicad_sym file and select the file and click open.',
      image: '/tutorial/IMG 3.png',
      alt: 'Click Add Library option and select kicad_sym file',
    },
    {
      stepNumber: 5,
      title: 'Step 5',
      text: 'In the Libraries drop down list, you can see the library name same exact what you have in the folder and double click on the library name to open the component symbol present inside the library.',
      image: '/tutorial/IMG 4.png',
      alt: 'Double click on library name in libraries list',
    },
    {
      stepNumber: 6,
      title: 'Step 6',
      text: 'Again double click on the component symbol name to view the symbol.',
      image: '/tutorial/IMG 5.png',
      alt: 'Double click on component symbol name to view symbol',
    },
    {
      stepNumber: 7,
      title: 'Step 7',
      text: 'Right click on the component symbol name and click on the Symbol Properties.',
      image: '/tutorial/IMG 6.png',
      alt: 'Right click on component symbol name and click Symbol Properties',
    },
    {
      stepNumber: 8,
      title: 'Step 8',
      text: 'A new pop-up will open about the properties of the symbol. Now click on the browse button in the same box of Footprint.',
      image: '/tutorial/IMG 7.png',
      alt: 'Browse button in the Footprint box in Symbol Properties',
    },
    {
      stepNumber: 9,
      title: 'Step 9',
      text: 'To select the desired footprint follow the Tutorial procedure of adding the footprint in KiCAD.',
      image: null,
      hasFootprintLink: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      {/* Navigation breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/" 
          className="text-blue-600 hover:text-blue-800 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors"
        >
          &larr; Back to Library
        </Link>
        <Link
          href="/tutorial/footprint"
          className="text-slate-500 hover:text-slate-800 font-semibold text-sm inline-flex items-center gap-1 transition-colors"
        >
          Footprint Tutorial &rarr;
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
          How to add Symbol in the KiCAD software?
        </h2>
      </div>

      {/* Tutorial Steps */}
      <div className="space-y-8">
        {steps.map((item) => (
          <div 
            key={item.stepNumber}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-blue-600/20">
                {item.stepNumber}
              </span>
              <div className="flex-1 pt-1.5">
                <p className="text-base sm:text-lg text-slate-800 font-semibold leading-relaxed">
                  <span className="font-bold text-slate-900">{item.title}: </span>
                  {item.text}
                </p>

                {/* Display step image if present */}
                {item.image && (
                  <div className="mt-5 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shadow-inner">
                    <img
                      src={item.image}
                      alt={item.alt || item.title}
                      className="w-full h-auto object-contain max-h-[540px] mx-auto block hover:scale-[1.01] transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Prominent Link to Footprint Tutorial right below Step 9 */}
                {item.hasFootprintLink && (
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <Link
                      href="/tutorial/footprint"
                      className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-base active:scale-95"
                    >
                      <span>Footprint Tutorial</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="mt-12 text-center pt-8 border-t border-slate-200">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors"
        >
          &larr; Back to Component Library
        </Link>
      </div>
    </div>
  );
}
