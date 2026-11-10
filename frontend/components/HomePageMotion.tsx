'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  FileCode2,
  Layers,
  Mail,
  Ruler,
  Terminal,
} from 'lucide-react';

const fadeEase = [0.22, 1, 0.36, 1] as const;

const heroContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
    },
  },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, ease: fadeEase },
  },
};

export default function HomePageMotion() {
  const [cadView, setCadView] = useState<'footprint' | 'symbol'>('footprint');

  return (
    <div className="space-y-16 sm:space-y-20 pb-8">
      {/* HERO SECTION: Asymmetric Engineering Workbench */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={heroContainer}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-4 sm:pt-8 lg:pt-12"
      >
        {/* Left Column: Product Proposition & Primary Actions */}
        <div className="lg:col-span-6 space-y-6">
          {/* Clean Brand Mark Lockup */}
          <motion.div variants={heroItem} className="flex items-center gap-4">
            <div className="w-24 sm:w-28 rounded-xl bg-white border border-[#161513]/10 px-2.5 py-2 flex items-center justify-center flex-shrink-0 shadow-[0_1px_2px_rgba(22,21,19,0.05)]">
              <img
                src="/logo.png"
                alt="S SQUARE ELECTRONICS IC Package Mark"
                className="w-full h-auto object-contain select-none"
              />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs text-[#9a6320] tracking-[0.01em] tabular-nums">
                SSQ-CAD · KiCAD 7 / 8
              </p>
              <p className="text-sm font-medium text-[#161513]">
                Hardware Component Library
              </p>
              <p className="text-xs text-[#76736c]">
                Symbols, footprints &amp; custom board routing
              </p>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={heroItem}
            className="text-4xl sm:text-[44px] lg:text-[52px] font-medium tracking-[-0.025em] text-[#161513] leading-[1.06]"
          >
            PCB Component Hub for KiCAD engineering
          </motion.h1>

          {/* Technical Description */}
          <motion.p
            variants={heroItem}
            className="text-[#52504a] text-base sm:text-lg max-w-xl leading-relaxed font-normal"
          >
            Verified schematic symbols (
            <code className="font-mono text-[13px] px-1.5 py-0.5 bg-[#eeede8] text-[#9a6320] rounded border border-[#161513]/10">
              .kicad_sym
            </code>
            ) and land patterns (
            <code className="font-mono text-[13px] px-1.5 py-0.5 bg-[#eeede8] text-[#167c4c] rounded border border-[#161513]/10">
              .kicad_mod
            </code>
            ) checked against manufacturer mechanical drawings, ready for schematic capture and routing.
          </motion.p>

          {/* Two Hero Actions (One Primary + One Secondary) */}
          <motion.div variants={heroItem} className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/components"
              className="h-11 px-5 bg-[#161513] hover:bg-[#2a2824] text-white font-medium text-sm rounded-lg inline-flex items-center gap-2 transition-colors duration-150 ease-unslop active:scale-[0.98]"
            >
              <span>Browse components</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>

            <Link
              href="/request/project"
              className="h-11 px-5 bg-white hover:bg-[#eeede8] text-[#161513] border border-[#161513]/14 font-medium text-sm rounded-lg inline-flex items-center gap-2 transition-colors duration-150 ease-unslop active:scale-[0.98]"
            >
              <span>Request project design</span>
            </Link>
          </motion.div>

          {/* Quiet Spec Strip */}
          <motion.div
            variants={heroItem}
            className="pt-4 border-t border-[#161513]/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-[#76736c] tabular-nums"
          >
            <span>IPC-7351B land patterns</span>
            <span>S-expression source files</span>
            <span>Direct fabrication Gerbers</span>
          </motion.div>
        </div>

        {/* Right Column: Live Code-Rendered KiCAD Artifact Preview */}
        <motion.div variants={heroItem} className="lg:col-span-6">
          <div className="bg-white border border-[#161513]/12 rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(22,21,19,0.06)]">
            {/* CAD Instrument Header */}
            <div className="px-4 py-3 bg-[#f6f5f1] border-b border-[#161513]/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-xs text-[#52504a] tabular-nums">
                <span className="w-2 h-2 rounded-full bg-[#167c4c]" aria-hidden="true" />
                <span>SSQ-QFP32 · Rev 8.0</span>
              </div>

              {/* Interactive CAD Mode Switcher */}
              <div className="inline-flex bg-[#eeede8] p-0.5 rounded-lg border border-[#161513]/8">
                <button
                  type="button"
                  onClick={() => setCadView('footprint')}
                  className={`h-7 px-2.5 rounded-md font-mono text-[11px] transition-colors duration-150 ease-unslop ${
                    cadView === 'footprint'
                      ? 'bg-[#151514] text-white'
                      : 'text-[#52504a] hover:text-[#161513]'
                  }`}
                >
                  .kicad_mod
                </button>
                <button
                  type="button"
                  onClick={() => setCadView('symbol')}
                  className={`h-7 px-2.5 rounded-md font-mono text-[11px] transition-colors duration-150 ease-unslop ${
                    cadView === 'symbol'
                      ? 'bg-[#9a6320] text-white'
                      : 'text-[#52504a] hover:text-[#161513]'
                  }`}
                >
                  .kicad_sym
                </button>
              </div>
            </div>

            {/* CAD Drafting Canvas */}
            {cadView === 'footprint' ? (
              <div className="h-[320px] sm:h-[360px] bg-soldermask-grid relative p-4 flex items-center justify-center">
                {/* Corner coordinate markers */}
                <span className="absolute top-3 left-4 font-mono text-[11px] text-[#8f8c84] tabular-nums">
                  X 0.00 Y 0.00 GRID 0.50mm
                </span>
                <span className="absolute top-3 right-4 font-mono text-[11px] text-[#c89452] tabular-nums">
                  F.Cu + F.SilkS
                </span>
                <span className="absolute bottom-3 left-4 font-mono text-[11px] text-[#8f8c84] tabular-nums">
                  LQFP-32 7.0×7.0mm
                </span>
                <span className="absolute bottom-3 right-4 font-mono text-[11px] text-[#4cc38a] tabular-nums">
                  DRC 0.00mm
                </span>

                {/* Precision QFP-32 ENIG Footprint SVG */}
                <svg
                  viewBox="0 0 280 240"
                  className="w-full max-w-[280px] h-auto"
                  role="img"
                  aria-label="KiCAD 32-pin Quad Flat Package PCB footprint diagram"
                >
                  {/* Courtyard hairline */}
                  <rect
                    x="44"
                    y="24"
                    width="192"
                    height="192"
                    fill="none"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                  />

                  {/* Center Crosshair */}
                  <line x1="140" y1="36" x2="140" y2="204" stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />
                  <line x1="56" y1="120" x2="224" y2="120" stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />

                  {/* Silkscreen Body Outline */}
                  <polygon
                    points="82,62 198,62 198,178 76,178 76,68"
                    fill="rgba(255,255,255,0.03)"
                    stroke="#e5e4df"
                    strokeWidth="1.2"
                  />

                  {/* Central ENIG Exposed Pad */}
                  <rect
                    x="104"
                    y="84"
                    width="72"
                    height="72"
                    rx="2"
                    fill="rgba(200,148,82,0.22)"
                    stroke="#c89452"
                    strokeWidth="1.2"
                  />
                  {/* Exposed pad paste cutouts */}
                  <rect x="110" y="90" width="26" height="26" fill="#c89452" opacity="0.72" />
                  <rect x="144" y="90" width="26" height="26" fill="#c89452" opacity="0.72" />
                  <rect x="110" y="124" width="26" height="26" fill="#c89452" opacity="0.72" />
                  <rect x="144" y="124" width="26" height="26" fill="#c89452" opacity="0.72" />

                  {/* Top 8 SMD Pads */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <rect
                      key={`t-${i}`}
                      x={84 + i * 15}
                      y={38}
                      width="8"
                      height="18"
                      rx="1"
                      fill="#c89452"
                    />
                  ))}
                  {/* Bottom 8 SMD Pads */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <rect
                      key={`b-${i}`}
                      x={84 + i * 15}
                      y={184}
                      width="8"
                      height="18"
                      rx="1"
                      fill="#c89452"
                    />
                  ))}
                  {/* Left 8 SMD Pads */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <rect
                      key={`l-${i}`}
                      x={52}
                      y={64 + i * 15}
                      width="18"
                      height="8"
                      rx="1"
                      fill="#c89452"
                    />
                  ))}
                  {/* Right 8 SMD Pads */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <rect
                      key={`r-${i}`}
                      x={210}
                      y={64 + i * 15}
                      width="18"
                      height="8"
                      rx="1"
                      fill="#c89452"
                    />
                  ))}

                  {/* Pin 1 Fiducial Dot */}
                  <circle cx="63" cy="48" r="3" fill="#c89452" />
                  {/* Designator U1 */}
                  <text
                    x="140"
                    y="123"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontFamily="var(--font-jetbrains-mono), monospace"
                    fontWeight="500"
                  >
                    U1
                  </text>
                </svg>
              </div>
            ) : (
              <div className="h-[320px] sm:h-[360px] bg-vellum-grid relative p-4 flex items-center justify-center">
                <span className="absolute top-3 left-4 font-mono text-[11px] text-[#76736c] tabular-nums">
                  SHEET 01 / IEC-60617
                </span>
                <span className="absolute top-3 right-4 font-mono text-[11px] text-[#9a6320] tabular-nums">
                  REF U?
                </span>
                <span className="absolute bottom-3 left-4 font-mono text-[11px] text-[#76736c] tabular-nums">
                  GRID 50 mil (1.27mm)
                </span>
                <span className="absolute bottom-3 right-4 font-mono text-[11px] text-[#167c4c] tabular-nums">
                  ERC Verified
                </span>

                {/* Authentic KiCAD Schematic Symbol Diagram */}
                <svg
                  viewBox="0 0 320 220"
                  className="w-full max-w-[320px] h-auto"
                  role="img"
                  aria-label="KiCAD microcontroller schematic symbol diagram"
                >
                  {/* Symbol Frame Box */}
                  <rect
                    x="92"
                    y="38"
                    width="136"
                    height="144"
                    fill="#f7f1de"
                    stroke="#7c281c"
                    strokeWidth="1.5"
                  />
                  {/* Designator & Value */}
                  <text
                    x="94"
                    y="28"
                    fill="#167c4c"
                    fontSize="11"
                    fontFamily="var(--font-jetbrains-mono), monospace"
                    fontWeight="500"
                  >
                    U?
                  </text>
                  <text
                    x="160"
                    y="28"
                    fill="#9a6320"
                    fontSize="11"
                    fontFamily="var(--font-jetbrains-mono), monospace"
                    fontWeight="500"
                  >
                    SSQ-MCU32
                  </text>

                  {/* Left Pins */}
                  {[
                    { pin: '1', name: '3V3', y: 64 },
                    { pin: '2', name: 'EN', y: 96 },
                    { pin: '3', name: 'IO0', y: 128 },
                    { pin: '4', name: 'RXD', y: 160 },
                  ].map((item) => (
                    <g key={item.pin}>
                      <line x1="56" y1={item.y} x2="92" y2={item.y} stroke="#7c281c" strokeWidth="1.4" />
                      <circle cx="56" cy={item.y} r="2.2" fill="none" stroke="#7c281c" strokeWidth="1.2" />
                      <text
                        x="72"
                        y={item.y - 4}
                        fill="#76736c"
                        fontSize="9"
                        fontFamily="var(--font-jetbrains-mono), monospace"
                      >
                        {item.pin}
                      </text>
                      <text
                        x="98"
                        y={item.y + 3}
                        fill="#167c4c"
                        fontSize="10"
                        fontFamily="var(--font-jetbrains-mono), monospace"
                      >
                        {item.name}
                      </text>
                    </g>
                  ))}

                  {/* Right Pins */}
                  {[
                    { pin: '5', name: 'SDA', y: 64 },
                    { pin: '6', name: 'SCL', y: 96 },
                    { pin: '7', name: 'TXD', y: 128 },
                    { pin: '8', name: 'GND', y: 160 },
                  ].map((item) => (
                    <g key={item.pin}>
                      <line x1="228" y1={item.y} x2="264" y2={item.y} stroke="#7c281c" strokeWidth="1.4" />
                      <circle cx="264" cy={item.y} r="2.2" fill="none" stroke="#7c281c" strokeWidth="1.2" />
                      <text
                        x="240"
                        y={item.y - 4}
                        fill="#76736c"
                        fontSize="9"
                        fontFamily="var(--font-jetbrains-mono), monospace"
                      >
                        {item.pin}
                      </text>
                      <text
                        x="222"
                        y={item.y + 3}
                        textAnchor="end"
                        fill="#167c4c"
                        fontSize="10"
                        fontFamily="var(--font-jetbrains-mono), monospace"
                      >
                        {item.name}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}

            {/* CAD Inspector Spec Footer */}
            <div className="px-4 py-3 bg-[#f6f5f1] border-t border-[#161513]/10 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs text-[#52504a] tabular-nums">
                {cadView === 'footprint'
                  ? '32 pads · 0.80mm pitch · Thermal via grid'
                  : '8 logical pins · ERC passive/power typed'}
              </span>
              <Link
                href="/components"
                className="font-mono text-xs font-medium text-[#9a6320] hover:text-[#7a4c14] inline-flex items-center gap-1 transition-colors duration-150 ease-unslop"
              >
                <span>Open library</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* SECTION 01: ENGINEERING WORKFLOW */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#161513]/10 pb-4">
          <div className="space-y-1">
            <p className="font-mono text-xs text-[#76736c] tabular-nums">01 · Workflow</p>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#161513] tracking-[-0.015em]">
              From component selection to routed board
            </h2>
          </div>
          <p className="text-sm text-[#52504a] max-w-sm">
            Structured CAD assets, visual import guides, and direct engineering turnarounds.
          </p>
        </div>

        {/* Connected Drafting Grid Row */}
        <div className="bg-white border border-[#161513]/10 rounded-2xl grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#161513]/10 overflow-hidden">
          {/* Column 1: Catalog */}
          <div className="p-6 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-[#eeede8] border border-[#161513]/10 text-[#161513] flex items-center justify-center">
                  <Cpu className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-xs text-[#76736c] tabular-nums">01</span>
              </div>
              <h3 className="text-lg font-medium text-[#161513]">Browse and download</h3>
              <p className="text-sm text-[#52504a] leading-relaxed">
                Search verified ICs, microcontrollers, passives, and sensors. Inspect symbol and 2D land patterns before downloading source files.
              </p>
            </div>
            <div className="pt-4 border-t border-[#161513]/8">
              <Link
                href="/components"
                className="text-sm font-medium text-[#9a6320] hover:text-[#7a4c14] inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop"
              >
                <span>Explore catalog</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          {/* Column 2: Documentation */}
          <div className="p-6 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-[#eeede8] border border-[#161513]/10 text-[#161513] flex items-center justify-center">
                  <BookOpen className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-xs text-[#76736c] tabular-nums">02</span>
              </div>
              <h3 className="text-lg font-medium text-[#161513]">Step-by-step tutorials</h3>
              <p className="text-sm text-[#52504a] leading-relaxed">
                Follow illustrated KiCAD Symbol Editor and Footprint Editor guides to map library folders and assign footprints cleanly.
              </p>
            </div>
            <div className="pt-4 border-t border-[#161513]/8 flex flex-wrap items-center gap-4">
              <Link
                href="/tutorial/symbol"
                className="text-sm font-medium text-[#9a6320] hover:text-[#7a4c14] inline-flex items-center gap-1 transition-colors duration-150 ease-unslop"
              >
                <span>Symbol guide</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
              <Link
                href="/tutorial/footprint"
                className="text-sm font-medium text-[#167c4c] hover:text-[#115e39] inline-flex items-center gap-1 transition-colors duration-150 ease-unslop"
              >
                <span>Footprint guide</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          {/* Column 3: Custom Engineering */}
          <div className="p-6 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-[#eeede8] border border-[#161513]/10 text-[#161513] flex items-center justify-center">
                  <Layers className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-xs text-[#76736c] tabular-nums">03</span>
              </div>
              <h3 className="text-lg font-medium text-[#161513]">Request custom work</h3>
              <p className="text-sm text-[#52504a] leading-relaxed">
                Need a missing component library or full custom PCB schematic, board routing, and fabrication Gerber archive? Submit your specs directly.
              </p>
            </div>
            <div className="pt-4 border-t border-[#161513]/8 flex flex-wrap items-center gap-4">
              <Link
                href="/request/component"
                className="text-sm font-medium text-[#9a6320] hover:text-[#7a4c14] inline-flex items-center gap-1 transition-colors duration-150 ease-unslop"
              >
                <span>Request component</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
              <Link
                href="/request/project"
                className="text-sm font-medium text-[#161513] hover:text-[#9a6320] inline-flex items-center gap-1 transition-colors duration-150 ease-unslop"
              >
                <span>Project design</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 02: ENGINEERING STANDARDS (Dark Instrument Chassis) */}
      <section className="bg-[#151514] text-[#f2f1ed] rounded-2xl border border-white/10 p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-5 space-y-3">
            <p className="font-mono text-xs text-[#c89452] tabular-nums">02 · Standards</p>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.015em] text-white leading-snug">
              Built for hardware engineers, verified at pad level
            </h2>
            <p className="text-sm text-[#a6a39c] leading-relaxed">
              Every symbol, land pattern, and custom PCB project package follows clean KiCAD native structure without third-party format conversion.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-[#1f1e1c] border border-white/10 space-y-2.5">
              <FileCode2 className="w-4 h-4 text-[#c89452]" strokeWidth={1.5} />
              <h3 className="text-base font-medium text-white">KiCAD 7 &amp; 8 native</h3>
              <p className="text-sm text-[#a6a39c] leading-relaxed">
                Standard S-expression{' '}
                <code className="font-mono text-xs text-[#c89452]">.kicad_sym</code> and{' '}
                <code className="font-mono text-xs text-[#c89452]">.kicad_mod</code> formats ready for immediate import.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#1f1e1c] border border-white/10 space-y-2.5">
              <Ruler className="w-4 h-4 text-[#c89452]" strokeWidth={1.5} />
              <h3 className="text-base font-medium text-white">Verified pinouts &amp; pitch</h3>
              <p className="text-sm text-[#a6a39c] leading-relaxed">
                Pad geometries, pin numbering, courtyards, and silkscreen markings checked directly against datasheet drawings.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#1f1e1c] border border-white/10 space-y-2.5">
              <Terminal className="w-4 h-4 text-[#c89452]" strokeWidth={1.5} />
              <h3 className="text-base font-medium text-white">Open library access</h3>
              <p className="text-sm text-[#a6a39c] leading-relaxed">
                Zero subscription gates or download quotas for hobbyists, university labs, and embedded engineering teams.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#1f1e1c] border border-white/10 space-y-2.5">
              <Mail className="w-4 h-4 text-[#c89452]" strokeWidth={1.5} />
              <h3 className="text-base font-medium text-white">Direct engineering contact</h3>
              <p className="text-sm text-[#a6a39c] leading-relaxed">
                Need package revisions or PCB feedback? Write to{' '}
                <a
                  href="mailto:ssquareelectronics2026@gmail.com"
                  className="font-mono text-xs text-[#c89452] hover:underline underline-offset-2"
                >
                  ssquareelectronics2026@gmail.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 03: ACTION STRIP */}
      <section className="bg-white border border-[#161513]/10 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-medium text-[#161513] tracking-[-0.015em]">
            Ready to start your PCB layout
          </h3>
          <p className="text-sm text-[#52504a] max-w-lg">
            Browse verified catalog parts or request custom footprints and full board designs from our engineering desk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/components"
            className="h-10 px-4 bg-[#161513] hover:bg-[#2a2824] text-white font-medium text-sm rounded-lg inline-flex items-center gap-2 transition-colors duration-150 ease-unslop active:scale-[0.98]"
          >
            <span>Browse catalog</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <Link
            href="/request/component"
            className="h-10 px-4 bg-[#eeede8] hover:bg-[#e5e3dc] text-[#161513] border border-[#161513]/10 font-medium text-sm rounded-lg inline-flex items-center transition-colors duration-150 ease-unslop active:scale-[0.98]"
          >
            Request component
          </Link>
          <Link
            href="/request/project"
            className="h-10 px-4 bg-white hover:bg-[#f6f5f1] text-[#9a6320] border border-[#9a6320]/30 font-medium text-sm rounded-lg inline-flex items-center transition-colors duration-150 ease-unslop active:scale-[0.98]"
          >
            Request project design
          </Link>
        </div>
      </section>
    </div>
  );
}
