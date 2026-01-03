'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';

export const Hero = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
  };

  return (
    <section className="relative pt-32 pb-20 overflow-hidden min-h-[90vh] flex items-center justify-center">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl overflow-hidden pointer-events-none opacity-20 z-0">
         <motion.div 
           animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
           className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px]" 
         />
         <motion.div 
           animate={{ scale: [1, 1.3, 1], rotate: [0, -60, 0] }}
           transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
           className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-purple-600 rounded-full blur-[100px]" 
         />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold uppercase tracking-wider mb-8">
            <Zap className="w-4 h-4 fill-indigo-400" />
            AI-Powered Deal Detection
          </motion.div>
          
          <motion.h1 variants={item} className="text-5xl md:text-7xl font-space font-bold text-white mb-6 leading-[1.1]">
            Find Profitable Flips <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">Before Anyone Else</span>
          </motion.h1>
          
          <motion.p variants={item} className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Magnus Flipper AI monitors 7+ marketplaces 24/7, analyzing millions of listings with AI to send you instant alerts on underpriced items before they're gone.
          </motion.p>
          
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link 
              href="https://app.magnusflipper.ai/signup" 
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white h-14 px-8 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 group"
            >
              Start 7-Day Free Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white h-14 px-8 rounded-full font-bold transition-all border border-slate-700">
              Watch Demo
            </button>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-slate-800/60 pt-8">
             {[
               { label: "Alert Speed", value: "< 30s" },
               { label: "Active Users", value: "50K+" },
               { label: "Deals Found", value: "2M+" },
               { label: "App Rating", value: "4.9/5" },
             ].map((stat, i) => (
               <motion.div 
                 key={i}
                 whileHover={{ scale: 1.05 }}
                 className="cursor-default"
               >
                 <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                 <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
               </motion.div>
             ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};