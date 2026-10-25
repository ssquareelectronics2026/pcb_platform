'use client';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut' },
  },
};

const cardHoverVariants: Variants = {
  hover: {
    y: -8,
    scale: 1.01,
    boxShadow: '0 20px 35px -10px rgba(37, 99, 235, 0.12)',
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

export default function HomePageMotion() {
  return (
    <div className="space-y-16 sm:space-y-24 relative z-10 pb-8">
      
      {/* HERO SECTION */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="text-center py-12 sm:py-20 px-4 bg-white/75 border border-slate-200/80 backdrop-blur-md rounded-[2.5rem] shadow-xl shadow-slate-200/50 relative overflow-hidden"
      >
        {/* Animated ambient background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/70 via-white to-emerald-50/40 pointer-events-none"></div>
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          
          {/* Prominent Centered Logo with Gentle Floating Animation */}
          <motion.div variants={itemVariants} className="flex justify-center items-center">
            <motion.div
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 4,
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="relative inline-flex items-center justify-center p-2 cursor-pointer group"
            >
              {/* Soft ambient pulse glow behind logo */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-sky-300/20 to-emerald-400/20 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none scale-125" />
              
              <img 
                src="/logo.png" 
                alt="S SQUARE ELECTRONICS Logo" 
                className="relative z-10 w-48 sm:w-60 md:w-72 lg:w-80 h-auto object-contain drop-shadow-md select-none" 
              />
            </motion.div>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]"
          >
            PCB Component Hub
          </motion.h1>

          {/* Descriptive CAD text */}
          <motion.p 
            variants={itemVariants}
            className="text-slate-600 text-base sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Your dedicated engineering resource for verified KiCAD schematic symbols (<code className="text-blue-700 bg-blue-50 font-semibold px-1.5 py-0.5 rounded text-sm sm:text-base border border-blue-100">.kicad_sym</code>) and PCB footprints (<code className="text-emerald-700 bg-emerald-50 font-semibold px-1.5 py-0.5 rounded text-sm sm:text-base border border-emerald-100">.kicad_mod</code>).
          </motion.p>

          <motion.p 
            variants={itemVariants}
            className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
          >
            Accelerate your hardware designs with verified, production-ready KiCAD libraries and step-by-step documentation.
          </motion.p>

          {/* Call-to-Action Buttons */}
          <motion.div 
            variants={itemVariants}
            className="pt-4 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 max-w-2xl mx-auto"
          >
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/components"
                className="px-7 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/25 transition-all flex items-center gap-2"
              >
                <span>Browse Components</span>
                <span>&rarr;</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/tutorial/symbol"
                className="px-6 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all inline-block"
              >
                Symbol Tutorial
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/tutorial/footprint"
                className="px-6 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all inline-block"
              >
                Footprint Tutorial
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
              <a
                href="https://www.kicad.org/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 bg-slate-900 hover:bg-blue-600 text-white font-bold text-base rounded-2xl shadow-sm hover:shadow-lg hover:shadow-slate-900/10 transition-all inline-flex items-center gap-1.5"
              >
                <span>Download KiCAD</span>
                <span className="text-xs">↗</span>
              </a>
            </motion.div>
          </motion.div>

        </div>
      </motion.section>

      {/* HOW IT WORKS / PLATFORM WORKFLOW */}
      <section className="space-y-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto space-y-3"
        >
          <span className="text-xs uppercase font-extrabold tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3.5 py-1">
            Platform Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            How It Works
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Everything you need to go from component selection to PCB routing in KiCAD.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Browse & Download */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            variants={cardHoverVariants}
            whileHover="hover"
            className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm flex flex-col justify-between group cursor-default"
          >
            <div className="space-y-4">
              <motion.div 
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-14 h-14 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black transition-transform"
              >
                📦
              </motion.div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                1. Browse &amp; Download
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
          </motion.div>

          {/* Card 2: Step-by-Step Tutorials */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            variants={cardHoverVariants}
            whileHover="hover"
            className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm flex flex-col justify-between group cursor-default"
          >
            <div className="space-y-4">
              <motion.div 
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-black transition-transform"
              >
                📚
              </motion.div>
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
          </motion.div>

          {/* Card 3: Custom Component Requests */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.3 }}
            variants={cardHoverVariants}
            whileHover="hover"
            className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm flex flex-col justify-between group cursor-default"
          >
            <div className="space-y-4">
              <motion.div 
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-14 h-14 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl font-black transition-transform"
              >
                🚀
              </motion.div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                3. Request Custom Parts
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Can&apos;t find a specific component? Submit a reference URL, datasheet, or part description. Our team will design, verify, and email you when it&apos;s ready.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-3">
              <Link
                href="/request/component"
                className="text-amber-700 font-bold text-sm inline-flex items-center gap-1 hover:underline"
              >
                <span>Request Component</span>
                <span>&rarr;</span>
              </Link>
              <span className="text-slate-300">•</span>
              <Link
                href="/request/project"
                className="text-blue-600 font-bold text-sm inline-flex items-center gap-1 hover:underline"
              >
                <span>Project Design</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </motion.div>

        </div>
      </section>

      {/* VALUE HIGHLIGHTS */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="bg-slate-900 text-white rounded-[2.5rem] p-8 sm:p-14 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
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
            <motion.div whileHover={{ x: 4 }} className="flex gap-4 items-start transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1">KiCAD 7 &amp; 8 Ready</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  All exported files strictly follow KiCAD s-expression standards for instant import without format conversion.
                </p>
              </div>
            </motion.div>

            <motion.div whileHover={{ x: 4 }} className="flex gap-4 items-start transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1">Verified Dimensions &amp; Pinouts</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Footprint pad geometries, pin numbering, and 3D keep-outs are checked against manufacturer specifications.
                </p>
              </div>
            </motion.div>

            <motion.div whileHover={{ x: 4 }} className="flex gap-4 items-start transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1">100% Free &amp; Open Access</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  No subscription fees or download caps. Open access for hobbyists, engineering students, and commercial teams.
                </p>
              </div>
            </motion.div>

            <motion.div whileHover={{ x: 4 }} className="flex gap-4 items-start transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1">Direct Engineering Support</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Have questions or custom requirements? Email us directly at <a href="mailto:ssquareelectronics2026@gmail.com" className="text-blue-400 underline">ssquareelectronics2026@gmail.com</a>.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* FINAL CALL TO ACTION */}
      <motion.section 
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.55 }}
        className="text-center bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 shadow-sm"
      >
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
          Ready to start your PCB layout?
        </h3>
        <p className="text-slate-500 text-base max-w-lg mx-auto mb-8 font-medium">
          Browse our component catalog or request a custom footprint for your hardware project.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="/components"
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm inline-block"
            >
              Browse Catalog &rarr;
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="/request/component"
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all text-sm inline-block border border-slate-200"
            >
              Request Component
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="/request/project"
              className="px-6 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-all text-sm inline-block border border-indigo-200"
            >
              Request Project Design
            </Link>
          </motion.div>
        </div>
      </motion.section>

    </div>
  );
}
