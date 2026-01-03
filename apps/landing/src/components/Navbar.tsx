'use client';

import { motion } from 'framer-motion';
import { Database, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="font-space font-bold text-xl tracking-tight text-white">Magnus Flipper</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</Link>
          <Link href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</Link>
          <Link href="#faq" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">FAQ</Link>
          <Link 
            href="https://app.magnusflipper.ai/login" 
            className="text-sm font-bold text-white hover:text-indigo-400 transition-colors"
          >
            Log In
          </Link>
          <Link 
            href="https://app.magnusflipper.ai/signup" 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-slate-300" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="md:hidden border-t border-slate-800 bg-slate-950 px-6 py-4 space-y-4"
        >
          <Link href="#features" className="block text-slate-400" onClick={() => setIsOpen(false)}>Features</Link>
          <Link href="#pricing" className="block text-slate-400" onClick={() => setIsOpen(false)}>Pricing</Link>
          <Link href="https://app.magnusflipper.ai/login" className="block text-white font-bold" onClick={() => setIsOpen(false)}>Log In</Link>
        </motion.div>
      )}
    </motion.nav>
  );
};