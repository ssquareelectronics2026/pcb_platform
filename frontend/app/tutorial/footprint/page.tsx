import Link from 'next/link';
import TutorialStepCard from '@/components/TutorialStepCard';

export const metadata = {
  title: 'KiCAD Footprint Tutorial | PCB Component Hub',
  description: 'Documentation tutorial for adding the symbol and footprint in KiCAD software.',
};

export default function FootprintTutorialPage() {
  const steps = [
    {
      stepNumber: 1,
      title: 'Step 1',
      text: 'After downloading the <component_name>.kicad_mod.',
      image: null,
    },
    {
      stepNumber: 2,
      title: 'Step 2',
      text: 'Create a folder <component_name>.pretty. The name of the folder should be same as the component footprint name you downloaded.',
      image: '/tutorial/IMG 8.png',
      alt: 'Create a folder <component_name>.pretty',
    },
    {
      stepNumber: 3,
      title: 'Step 3',
      text: 'Move the <component_name>.kicad_mod file into the folder <component_name>.pretty.',
      image: '/tutorial/IMG 9.png',
      alt: 'Move the <component_name>.kicad_mod file into the folder <component_name>.pretty',
    },
    {
      stepNumber: 4,
      title: 'Step 4',
      text: 'Open KiCAD and click on the Footprints Editor.',
      image: '/tutorial/IMG 10.png',
      alt: 'Open KiCAD and click on the Footprints Editor',
    },
    {
      stepNumber: 5,
      title: 'Step 5',
      text: 'Now click on the File tab present on the top left corner and then click Add library… option.',
      image: '/tutorial/IMG 11.png',
      alt: 'Click on File tab and then Add library option',
    },
    {
      stepNumber: 6,
      title: 'Step 6',
      text: 'A pop-up will open of your file explorer. Navigate to the folder path where you have saved <component_name>.pretty folder. Click on the folder and click Select Folder.',
      image: '/tutorial/IMG 12.png',
      alt: 'Select <component_name>.pretty folder in file explorer',
    },
    {
      stepNumber: 7,
      title: 'Step 7',
      text: 'Now in the droplist of Footprints → Items you can see the library <component_name> has been added. Right click on it and click Import Footprint option.',
      image: '/tutorial/IMG 13.png',
      alt: 'Right click on library and click Import Footprint option',
    },
    {
      stepNumber: 8,
      title: 'Step 8',
      text: 'A new pop-up will open about the import of footprint. Now navigate to the <component_name>.pretty folder and open the folder and click the <component_name>.kicad_mod and click Open.',
      image: '/tutorial/IMG 14.png',
      alt: 'Navigate to <component_name>.pretty folder and open <component_name>.kicad_mod',
    },
    {
      stepNumber: 9,
      title: 'Step 9',
      text: 'You can see the footprint available on the viewer side. Now just click Ctrl + S, a new pop-up Save Footprint As will open. In that pop-up search or navigate to the <component_name> folder select it and click OK and then click Overwrite.',
      image: '/tutorial/IMG 15.png',
      alt: 'Save Footprint As pop-up and overwrite in folder',
    },
    {
      stepNumber: 10,
      title: 'Step 10',
      text: 'Now you can see the footprint name under the footprints folder. Now safely close the Footprints Editor and then open the Symbols Editor. Navigate to the equivalent symbol to which you need to add the desired footprint. Right click on the symbol name and click Symbol Properties.',
      image: '/tutorial/IMG 16.png',
      alt: 'Symbols Editor, navigate to equivalent symbol, right click and select Symbol Properties',
    },
    {
      stepNumber: 11,
      title: 'Step 11',
      text: 'A new pop-up Library Symbol Properties will open and click on the Browse option (in the same tab of Footprint) to add the desired and equivalent footprint for the symbol.',
      image: '/tutorial/IMG 17.png',
      alt: 'Click Browse option in Footprint row of Library Symbol Properties',
    },
    {
      stepNumber: 12,
      title: 'Step 12',
      text: 'A new pop-up Footprint Chooser will open, here browse for the desired and equivalent footprint name you need to add for your symbol. Click on the and check the preview and click OK.',
      image: '/tutorial/IMG 18.png',
      alt: 'Footprint Chooser pop-up, browse for footprint and click OK',
    },
    {
      stepNumber: 13,
      title: 'Step 13',
      text: 'Once again Ctrl + S (before leaving the software) and safely exit the software.',
      image: null,
    },
  ];

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
          href="/components"
          className="text-slate-500 hover:text-slate-800 font-semibold text-sm inline-flex items-center gap-1 transition-colors"
        >
          Back to Components &rarr;
        </Link>
      </div>

      {/* Page Header */}
      <div className="bg-white/80 border border-slate-200/90 backdrop-blur-sm rounded-3xl p-8 md:p-10 shadow-sm mb-10 text-center">
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

      {/* Tutorial Steps with Motion */}
      <div className="space-y-8">
        {steps.map((item, index) => (
          <TutorialStepCard key={item.stepNumber} item={item} index={index} />
        ))}
      </div>

      {/* Closing Message Banner */}
      <div className="my-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white rounded-3xl p-8 sm:p-10 text-center shadow-xl shadow-blue-900/10 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-3xl block mb-2">🎉</span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Enjoy your PCB works and have a great success ahead!!!
          </h3>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="mt-12 text-center pt-8 border-t border-slate-200 flex flex-wrap items-center justify-center gap-4">
        <Link 
          href="/tutorial/symbol" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 font-bold rounded-xl shadow-sm hover:shadow transition-all text-sm active:scale-95"
        >
          &larr; View Symbol Tutorial
        </Link>
        <Link 
          href="/components" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm active:scale-95"
        >
          Back to Component Library &rarr;
        </Link>
      </div>
    </div>
  );
}
