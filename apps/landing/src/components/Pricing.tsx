'use client';

import { motion } from 'framer-motion';
import { Check, Crown } from 'lucide-react';

const plans = [
  {
    name: "Starter",
    price: "47",
    description: "For hobbyists just getting started.",
    features: ["5-minute alert speed", "6 Keyword Monitors", "Facebook Marketplace Only", "Standard Support"],
    popular: false
  },
  {
    name: "Pro",
    price: "144",
    description: "For serious flippers who want speed.",
    features: ["3-minute alert speed", "13 Keyword Monitors", "All Marketplaces", "AI Price Analysis", "Priority Support"],
    popular: true
  },
  {
    name: "Enterprise",
    price: "352",
    description: "For scaling operations and teams.",
    features: ["Instant alerts (<30s)", "18 Keyword Monitors", "All Marketplaces + API", "Dedicated Account Manager", "White-label Reports"],
    popular: false
  }
];

export const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-slate-900/30 border-y border-slate-800">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-space font-bold text-white mb-4"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400"
          >
            Pay for speed. The faster you know, the more you make.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, type: "spring" }}
              className={`relative rounded-2xl p-8 border ${plan.popular ? 'bg-indigo-950/20 border-indigo-500 shadow-2xl shadow-indigo-500/10 scale-105 z-10' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
            >
              {plan.popular && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1 shadow-lg"
                >
                  <Crown className="w-3 h-3" /> Most Popular
                </motion.div>
              )}

              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-slate-400 text-sm mb-6 h-10">{plan.description}</p>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-slate-500">/month</span>
              </div>

              <button className={`w-full py-3 rounded-lg font-bold mb-8 transition-all ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
                Get Started
              </button>

              <div className="space-y-4">
                {plan.features.map((feature, fIndex) => (
                  <div key={fIndex} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};