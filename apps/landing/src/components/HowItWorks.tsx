'use client';

import { motion } from 'framer-motion';
import { Search, Bell, MessageCircle, DollarSign } from 'lucide-react';

const steps = [
  {
    num: "01",
    title: "Set Searches",
    desc: "Enter keywords, price ranges, and condition filters for the items you want.",
    icon: Search
  },
  {
    num: "02",
    title: "Get Alerts",
    desc: "Receive instant push notifications the second a matching item is listed.",
    icon: Bell
  },
  {
    num: "03",
    title: "Message First",
    desc: "Use our pre-written templates to contact the seller before anyone else.",
    icon: MessageCircle
  },
  {
    num: "04",
    title: "Flip for Profit",
    desc: "Buy low, sell high. Track your profits directly in the dashboard.",
    icon: DollarSign
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-24 bg-slate-900/30 border-y border-slate-800">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-space font-bold text-white mb-4"
          >
            From Setup to Profit in Minutes
          </motion.h2>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-800 -z-10" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative text-center bg-slate-950 md:bg-transparent p-6 md:p-0 rounded-xl border md:border-none border-slate-800"
              >
                <div className="w-24 h-24 mx-auto bg-slate-900 rounded-full border-4 border-slate-950 flex items-center justify-center mb-6 relative z-10 shadow-xl">
                  <step.icon className="w-8 h-8 text-indigo-400" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-16 flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-500 uppercase tracking-wider"
        >
           <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> 2 Min Setup</span>
           <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> &lt;30s Alerts</span>
           <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> 24/7 Monitoring</span>
        </motion.div>
      </div>
    </section>
  );
};