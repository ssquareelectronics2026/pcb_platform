'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '/', exact: true },
    { name: 'Components', href: '/components', exact: false },
    { name: 'Symbol Tutorial', href: '/tutorial/symbol', exact: false },
    { name: 'Footprint Tutorial', href: '/tutorial/footprint', exact: false },
    { name: 'Request Component', href: '/request/component', exact: false },
    { name: 'Request Project Design', href: '/request/project', exact: false },
  ];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Brand Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <motion.div 
              whileHover={{ scale: 1.08, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center bg-transparent"
            >
              <img 
                src="/logo.png" 
                alt="S SQUARE ELECTRONICS Logo" 
                className="h-10 sm:h-11 w-auto max-w-[50px] object-contain transition-transform duration-300" 
              />
            </motion.div>
            <span className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 leading-tight group-hover:text-blue-600 transition-colors whitespace-nowrap">
              S SQUARE ELECTRONICS
            </span>
          </Link>

          {/* Desktop Navigation Tabs */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-1.5">
            {navItems.map((item) => {
              const active = isLinkActive(item.href, item.exact);
              return (
                <motion.div
                  key={item.name}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    href={item.href}
                    className={`px-2.5 xl:px-3.5 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all inline-block whitespace-nowrap ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}

            {/* External Download KiCAD link */}
            <motion.a
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              href="https://www.kicad.org/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 xl:ml-2 inline-flex items-center gap-1 px-3 xl:px-3.5 py-2 rounded-xl text-xs xl:text-sm font-bold bg-slate-900 hover:bg-blue-600 text-white shadow-sm transition-all shadow-slate-900/10 hover:shadow-blue-600/20 whitespace-nowrap flex-shrink-0"
            >
              <span>Download KiCAD</span>
              <span className="text-xs">↗</span>
            </motion.a>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex lg:hidden items-center">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </motion.button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown Menu with AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1.5 shadow-xl overflow-hidden"
          >
            {navItems.map((item) => {
              const active = isLinkActive(item.href, item.exact);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <div className="pt-2">
              <a
                href="https://www.kicad.org/download/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-blue-600 transition-all shadow-md shadow-slate-900/10"
              >
                <span>Download KiCAD</span>
                <span>↗</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
