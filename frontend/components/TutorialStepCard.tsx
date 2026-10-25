'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

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

export default function TutorialStepCard({ item, index }: TutorialStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-shadow duration-300"
    >
      <div className="flex items-start gap-4">
        <motion.span 
          whileHover={{ scale: 1.1, rotate: 4 }}
          className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-blue-600/25 cursor-default"
        >
          {item.stepNumber}
        </motion.span>
        <div className="flex-1 pt-1.5">
          <p className="text-base sm:text-lg text-slate-800 font-semibold leading-relaxed">
            <span className="font-bold text-slate-900">{item.title}: </span>
            {item.text}
          </p>

          {/* Display step image if present */}
          {item.image && (
            <motion.div 
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
              className="mt-5 rounded-2xl border border-slate-200/90 overflow-hidden bg-slate-50 shadow-inner group"
            >
              <img
                src={item.image}
                alt={item.alt || item.title}
                className="w-full h-auto object-contain max-h-[540px] mx-auto block group-hover:scale-[1.015] transition-transform duration-500 ease-out"
                loading="lazy"
              />
            </motion.div>
          )}

          {/* Prominent Link to Footprint Tutorial right below Step 9 */}
          {item.hasFootprintLink && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link
                  href="/tutorial/footprint"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-base"
                >
                  <span>Footprint Tutorial</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
