'use client';

import { motion } from 'framer-motion';
import { Zap, Brain, Globe, Filter, Search, BarChart3 } from 'lucide-react';

const features = [
  {
    title: "Instant Alerts",
    description: "Get push notifications within seconds of a new listing. Beat the competition to the deal.",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-400/10"
  },
  {
    title: "AI Price Analysis",
    description: "Our AI compares listings against historical sales data to calculate your potential profit margin instantly.",
    icon: Brain,
    color: "text-purple-400",
    bg: "bg-purple-400/10"
  },
  {
    title: "Multi-Marketplace",
    description: "Monitor Facebook Marketplace, eBay, Vinted, and Gumtree from one dashboard. Plus reference pricing from Amazon and CEX trade-in values.",
    icon: Globe,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10"
  },
  {
    title: "Smart Filters",
    description: "Filter out spam, dealer ads, and irrelevant items. Only see the deals that meet your ROI criteria.",
    icon: Filter,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10"
  },
  {
    title: "Keyword Tracking",
    description: "Run unlimited searches 24/7. We keep watching even when you're sleeping.",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-400/10"
  },
  {
    title: "Profit Calculator",
    description: "Factor in shipping, fees, and repair costs to see your net profit before you even send a message.",
    icon: BarChart3,
    color: "text-rose-400",
    bg: "bg-rose-400/10"
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
};

export const Features = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden bg-slate-950">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-space font-bold text-white mb-4"
          >
            Everything You Need to <br/> Flip Smarter
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400"
          >
            Built by flippers, for flippers. We've automated the tedious parts so you can focus on the profit.
          </motion.p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              whileHover={{ y: -5 }}
              className="glass-card p-8 rounded-2xl hover:bg-slate-800/80 transition-colors group cursor-default"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};