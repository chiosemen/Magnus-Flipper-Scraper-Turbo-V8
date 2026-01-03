'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-indigo-950/20 pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-space font-bold text-white mb-6">
            Ready to Find Deals <br/> Before Everyone Else?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Join 50,000+ flippers who are making full-time income with Magnus Flipper AI.
          </p>
          
          <Link 
            href="https://app.magnusflipper.ai/signup"
            className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-indigo-50 transition-colors shadow-xl shadow-indigo-500/10"
          >
            Start Your Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          
          <p className="mt-6 text-sm text-slate-500">
            No credit card required for trial • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};