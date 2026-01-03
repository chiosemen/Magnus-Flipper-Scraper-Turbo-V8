'use client';

import StackedLogo from './StackedLogo';
import { Twitter, Facebook, Instagram, Linkedin, Github } from 'lucide-react';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1 flex flex-col items-start">
            <StackedLogo size="sm" className="mb-6" />
            <p className="text-slate-500 text-sm leading-relaxed">
              The #1 tool for professional flippers. Find underpriced items instantly and automate your arbitrage business.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#features" className="hover:text-indigo-400">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-indigo-400">Pricing</Link></li>
              <li><Link href="#" className="hover:text-indigo-400">Live Demo</Link></li>
              <li><Link href="#" className="hover:text-indigo-400">Changelog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-indigo-400">Success Stories</Link></li>
              <li><Link href="#" className="hover:text-indigo-400">Flipping Guide</Link></li>
              <li><Link href="#faq" className="hover:text-indigo-400">Help Center</Link></li>
              <li><Link href="#" className="hover:text-indigo-400">API Docs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-indigo-400">About</Link></li>
              <li><Link href="#" className="hover:text-indigo-400">Careers</Link></li>
              <li><Link href="#" className="hover:text-indigo-400">Legal</Link></li>
              <li><Link href="#" className="hover:text-indigo-400">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-600 text-xs">
            &copy; {new Date().getFullYear()} Magnus-Tech.AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Twitter className="w-5 h-5 text-slate-600 hover:text-white cursor-pointer transition-colors" />
            <Facebook className="w-5 h-5 text-slate-600 hover:text-white cursor-pointer transition-colors" />
            <Instagram className="w-5 h-5 text-slate-600 hover:text-white cursor-pointer transition-colors" />
            <Linkedin className="w-5 h-5 text-slate-600 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
      </div>
    </footer>
  );
};