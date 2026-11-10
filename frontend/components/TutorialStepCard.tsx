'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface TutorialStepProps {
  item: {
    stepNumber: number;
    title: string;
    text: string;
    image?: string | null;
    alt?: string;
    hasFootprintLink?: boolean;
  };
  index: number;
}

function formatTutorialText(text: string) {
  const tokenRegex = /(<component_name>(?:\.(?:kicad_sym|kicad_mod|pretty))?|Ctrl \+ S)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (/^<component_name>/.test(part)) {
      return (
        <code
          key={idx}
          className="font-mono text-[13px] px-1.5 py-0.5 bg-[#eeede8] text-[#9a6320] border border-[#161513]/10 rounded mx-0.5"
        >
          {part}
        </code>
      );
    }
    if (part === 'Ctrl + S') {
      return (
        <kbd
          key={idx}
          className="font-mono text-xs px-1.5 py-0.5 bg-[#f6f5f1] text-[#161513] border border-[#161513]/20 rounded shadow-[0_1px_0_rgba(22,21,19,0.12)] mx-0.5"
        >
          {part}
        </kbd>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function TutorialStepCard({ item, index }: TutorialStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.32,
        delay: Math.min(index * 0.04, 0.24),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="bg-white border border-[#161513]/10 rounded-xl p-6 sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#161513] text-white font-mono tabular-nums text-xs font-medium flex items-center justify-center">
          {String(item.stepNumber).padStart(2, '0')}
        </span>

        <div className="flex-1 pt-0.5 min-w-0">
          <p className="text-sm sm:text-base text-[#52504a] leading-relaxed font-normal">
            <span className="font-medium text-[#161513]">{item.title}: </span>
            {formatTutorialText(item.text)}
          </p>

          {/* Display step image if present */}
          {item.image && (
            <div className="mt-4 rounded-lg border border-[#161513]/10 overflow-hidden bg-[#f6f5f1]">
              <img
                src={item.image}
                alt={item.alt || item.title}
                className="w-full h-auto object-contain max-h-[540px] mx-auto block"
                loading="lazy"
              />
            </div>
          )}

          {/* Prominent Link to Footprint Tutorial right below Step 9 */}
          {item.hasFootprintLink && (
            <div className="mt-5 pt-4 border-t border-[#161513]/8">
              <Link
                href="/tutorial/footprint"
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#161513] hover:bg-[#2a2824] text-white font-medium rounded-lg text-sm transition-colors duration-150 ease-unslop active:scale-[0.98]"
              >
                <span>Footprint Tutorial</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
