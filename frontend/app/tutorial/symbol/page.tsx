import Link from 'next/link';
import TutorialStepCard from '@/components/TutorialStepCard';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-8">
      {/* Navigation breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#161513]/10 pb-4">
        <Link
          href="/components"
          className="text-[#52504a] hover:text-[#161513] font-medium text-sm inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Back to components</span>
        </Link>
        <Link
          href="/tutorial/footprint"
          className="text-[#9a6320] hover:text-[#7a4c14] font-medium text-sm inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop"
        >
          <span>Footprint Tutorial</span>
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Page Header */}
      <div className="bg-white border border-[#161513]/10 rounded-2xl p-6 sm:p-8 space-y-3">
        <p className="font-mono text-xs text-[#9a6320] tabular-nums">
          KiCAD documentation · Symbol guide
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-medium text-[#161513] tracking-tight leading-snug">
          DOCUMENTATION TUTORIAL FOR ADDING THE SYMBOL AND FOOTPRINT IN KiCAD SOFTWARE
        </h1>
        <h2 className="text-base sm:text-lg font-medium text-[#52504a] pt-3 border-t border-[#161513]/8">
          How to add Symbol in the KiCAD software?
        </h2>
      </div>

      {/* Tutorial Steps */}
      <div className="space-y-4">
        {steps.map((item, index) => (
          <TutorialStepCard key={item.stepNumber} item={item} index={index} />
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="pt-6 border-t border-[#161513]/10 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/components"
          className="inline-flex items-center gap-2 h-10 px-4 bg-[#161513] hover:bg-[#2a2824] text-white font-medium rounded-lg transition-colors duration-150 ease-unslop text-sm active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Back to component library</span>
        </Link>
        <Link
          href="/tutorial/footprint"
          className="inline-flex items-center gap-2 h-10 px-4 bg-white hover:bg-[#eeede8] border border-[#161513]/12 text-[#161513] font-medium rounded-lg transition-colors duration-150 ease-unslop text-sm active:scale-[0.98]"
        >
          <span>View Footprint Tutorial</span>
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
